from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.chat import MessageCreate
from app.services import conversation_service
from app.services.llm_service import LLMProvider

router = APIRouter(prefix="/chat", tags=["chat"])
llm = LLMProvider()

@router.post("")
async def chat(message_in: MessageCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    print(f"--- CHAT REQUEST START ---")
    print(f"Received message from user {current_user.id}: {message_in.message}")
    # 1. Verify conversation belongs to user
    conversation = conversation_service.get_user_conversations(db, current_user.id)
    if not any(str(c.id) == str(message_in.conversation_id) for c in conversation):
        raise HTTPException(status_code=404, detail="Conversation not found")

    # 2. Save user message
    print(f"Saving user message to database...")
    conversation_service.add_message(db, message_in.conversation_id, role="user", content=message_in.message)

    # 3. Load history (last 20 messages)
    print(f"Loading conversation history...")
    history = conversation_service.get_recent_messages(db, message_in.conversation_id, limit=20)

    # 4. Convert format for LLM
    llm_messages = [{"role": msg.role, "content": msg.content} for msg in history]

    # 5. Define streaming generator
    async def stream_response():
        print(f"Started stream_response generator")
        full_response = ""
        # 6. Send to model and stream tokens
        try:
            async for chunk in llm.generate_stream(llm_messages, options=message_in.options):
                full_response += chunk
                yield chunk
            print(f"Stream completed. Total response length: {len(full_response)}")
        except Exception as e:
            print(f"ERROR during LLM stream: {e}")
            raise

        # 7. Save assistant response after stream completes
        # Note: We need a new session or reuse the existing one. 
        # For simplicity and thread safety in a generator, we create a new session locally.
        from app.db.database import SessionLocal
        local_db = SessionLocal()
        try:
            conversation_service.add_message(local_db, message_in.conversation_id, role="assistant", content=full_response)
            
            # Optionally update conversation updated_at
            conv = local_db.query(conversation_service.Conversation).filter(conversation_service.Conversation.id == message_in.conversation_id).first()
            from datetime import datetime
            conv.updated_at = datetime.utcnow()
            local_db.commit()
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
