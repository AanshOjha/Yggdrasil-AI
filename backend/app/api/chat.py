from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from fastapi.concurrency import run_in_threadpool
from app.db.database import get_db
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.chat import MessageCreate
from app.services import conversation_service
from app.services.llm_service import LLMProvider
from app.services.skill_router import route_skill
from app.models.file import File

router = APIRouter(prefix="/chat", tags=["chat"])
llm = LLMProvider()

@router.post("")
async def chat(message_in: MessageCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    print(f"--- CHAT REQUEST START ---")
    print(f"Received message from user {current_user.id}: {message_in.message}")
    # 1. Verify conversation belongs to user
    conversation = await run_in_threadpool(conversation_service.get_user_conversations, db, current_user.id)
    if not any(str(c.id) == str(message_in.conversation_id) for c in conversation):
        raise HTTPException(status_code=404, detail="Conversation not found")

    # 2. Save user message
    print(f"Saving user message to database...")
    user_msg = await run_in_threadpool(conversation_service.add_message, db, message_in.conversation_id, role="user", content=message_in.message)

    # 3. Load history (last 20 messages)
    print(f"Loading conversation history...")
    history = await run_in_threadpool(conversation_service.get_recent_messages, db, message_in.conversation_id, limit=10)

    # 4. Convert format for LLM
    import json
    llm_messages = []
    for msg in history:
        content = msg.content
        try:
            parsed = json.loads(content)
            if isinstance(parsed, (dict, list)):
                content = parsed
        except (json.JSONDecodeError, TypeError):
            pass
        
        if isinstance(content, dict):
            content = [content]

        if isinstance(content, list):
            new_content = []
            client = llm._get_client()
            for item in content:
                if isinstance(item, dict) and item.get("type") == "input_file":
                    file_id = item.get("file_id")
                    if file_id:
                        db_file = db.query(File).filter(File.openai_file_id == file_id).first()
                        if db_file:
                            ext = db_file.filename.lower().split('.')[-1]
                            if ext != 'pdf':
                                try:
                                    file_response = await client.files.content(file_id)
                                    file_text = file_response.read().decode('utf-8')
                                    new_content.append({
                                        "type": "input_text",
                                        "text": f"\n\n--- Content of {db_file.filename} ---\n{file_text}\n--- End of {db_file.filename} ---\n"
                                    })
                                    continue
                                except Exception as e:
                                    print(f"Error downloading file {file_id} content: {e}")
                new_content.append(item)
            content = new_content

        llm_messages.append({"role": msg.role, "content": content})

    # 4.5. Add Skill Router System Prompt
    print(f"Executing skill router...")
    user_files = db.query(File).filter(File.user_id == current_user.id).all()
    system_prompt = route_skill(message_in.message, user_files)
    
    if system_prompt:
        llm_messages.insert(0, {"role": "system", "content": system_prompt})
        
    # 5. Define streaming generator
    async def stream_response():
        print(f"Started stream_response generator")
        full_response = ""
        
        from app.services import semantic_cache
        from app.services.metrics_service import metrics_tracker
        import os
        import asyncio
        import time
        import re
        
        await metrics_tracker.record_request()
        start_time = time.time()
        
        # Build cacheable text from recent context + current message
        cacheable_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in llm_messages])
        
        cached_response = await semantic_cache.check(cacheable_text, threshold=0.92)
        
        if cached_response:
            print("Using cached response.")
            cache_time = time.time() - start_time
            
            # Strip old latency if present (for existing cache items)
            clean_response = re.sub(r'\n\n\*\s*\(Latency:.*?\)\s*\*$', '', cached_response)
            
            latency_string = f"\n\n*(⚡ Cache Hit Latency: {cache_time:.2f}s)*"
            full_response = clean_response + latency_string
            yield full_response
            
            # Record metrics
            total_time_ms = (time.time() - start_time) * 1000
            await metrics_tracker.record_latency(total_time_ms)
        else:
            # 6. Send to model and stream tokens
            try:
                first_token_received = False
                llm_start_time = time.time()
                
                async for chunk in llm.generate_stream(llm_messages, options=message_in.options, user=current_user):
                    if not first_token_received and chunk and not chunk.startswith("\\n\\n*(Latency:"):
                        first_token_received = True
                        ttft_ms = (time.time() - llm_start_time) * 1000
                        await metrics_tracker.record_ttft(ttft_ms)
                        
                    full_response += chunk
                    yield chunk
                    
                gen_time_ms = (time.time() - llm_start_time) * 1000
                await metrics_tracker.record_generation_time(gen_time_ms)
                
                print(f"Stream completed. Total response length: {len(full_response)}")
                
                # Store in cache in the background, stripping the latency tag
                clean_response = re.sub(r'\n\n\*\s*\(Latency:.*?\)\s*\*$', '', full_response)
                model_name = os.environ.get("DEPLOYMENT_NAME", "gpt-4")
                asyncio.create_task(semantic_cache.store(cacheable_text, clean_response, model_name))
                
                # Record metrics
                input_tokens = len(cacheable_text) // 4
                output_tokens = len(clean_response) // 4
                await metrics_tracker.record_tokens(input_tokens, output_tokens)
                
                total_time_ms = (time.time() - start_time) * 1000
                await metrics_tracker.record_latency(total_time_ms)
                
            except Exception as e:
                print(f"ERROR during LLM stream: {e}")
                await metrics_tracker.record_failure()
                from app.db.database import SessionLocal
                local_db = SessionLocal()
                try:
                    # Delete the faulty user message so it doesn't poison the history for subsequent messages
                    await run_in_threadpool(conversation_service.delete_message, local_db, user_msg.id)
                finally:
                    local_db.close()
                # Yield the error to the user so it displays in chat
                yield f"Error: {str(e)}"
                return

        # 7. Save assistant response after stream completes
        # Note: We need a new session or reuse the existing one. 
        # For simplicity and thread safety in a generator, we create a new session locally.
        from app.db.database import SessionLocal
        local_db = SessionLocal()
        try:
            await run_in_threadpool(conversation_service.add_message, local_db, message_in.conversation_id, role="assistant", content=full_response)
            
            # Optionally update conversation updated_at
            def update_conv(db_session, conv_id):
                conv = db_session.query(conversation_service.Conversation).filter(conversation_service.Conversation.id == conv_id).first()
                if conv:
                    from datetime import datetime
                    conv.updated_at = datetime.utcnow()
                    db_session.commit()
            
            await run_in_threadpool(update_conv, local_db, message_in.conversation_id)
        finally:
            local_db.close()

    # 8. Return StreamingResponse
    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream"
    )

@router.get("/{conversation_id}/messages")
def get_messages(conversation_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify ownership
    conversation = conversation_service.get_user_conversations(db, current_user.id)
    if not any(str(c.id) == str(conversation_id) for c in conversation):
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages = conversation_service.get_recent_messages(db, conversation_id, limit=100)
    return messages
