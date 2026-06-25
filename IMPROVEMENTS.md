Viewed chat.py:74-103
Viewed chat.py:1-73
Viewed llm_service.py:1-100
Searched for "fetch"
Viewed ChatApp.tsx:1-185
Viewed chatService.ts:1-59

Here are the exact answers based on a review of your codebase. 

### 3. How to Implement Semantic Caching
To implement semantic caching for near-instant responses on similar questions, you should integrate **Redis** (since you were looking into it earlier). Here is the exact flow you would implement in `backend/app/api/chat.py`:
1. **Generate Embedding:** Before doing anything else in the `chat` endpoint, take `message_in.message` and generate an embedding for it using a fast embedding model (e.g., Azure's `text-embedding-3-small`).
2. **Vector Search:** Query Redis (using `redisvl` or Redis search capabilities) for the closest matching vector to your new embedding.
3. **Threshold Check:** If a match is found and the vector distance (similarity) is extremely close (e.g., $>0.95$ cosine similarity), you have a "semantic cache hit".
4. **Bypass LLM:** Immediately return the cached response text from Redis. You can even simulate a stream by yielding it in small chunks, or just return it instantly.
5. **Cache Miss:** If no close match is found, proceed to your normal `llm.generate_stream()`. Once the stream finishes and you have the `full_response` (around line 58), save the `(prompt_embedding, full_response)` pair to Redis for future hits.

### 4. How Much History Context is Sent?
Looking at `chat.py` line 30:
```python
history = conversation_service.get_recent_messages(db, message_in.conversation_id, limit=20)
```
You are currently sending a **hard limit of the last 20 messages** in the conversation history. If the user writes long messages, 20 messages can easily exceed 2,000–5,000 tokens. 
*Note:* Since prompt caching usually kicks in automatically for >1024 tokens (depending on your Azure configuration), your 20-message history is likely benefiting from it, but reducing this limit to `10` or `5` would still improve the TTFT for new conversations that haven't hit the cache yet.

### 5. Blocking Awaits/Tasks Before First Token (Crucial Bottleneck found!)
**Yes, you have a major latency bottleneck here.** In `chat.py`, your endpoint is defined as asynchronous (`async def chat`), but look at what happens before the stream starts:
```python
conversation = conversation_service.get_user_conversations(db, current_user.id) # BLOCKING DB CALL
user_msg = conversation_service.add_message(db, message_in.conversation_id, role="user", content=message_in.message) # BLOCKING DB CALL
history = conversation_service.get_recent_messages(db, message_in.conversation_id, limit=20) # BLOCKING DB CALL
```
Because you are using standard synchronous SQLAlchemy (`Session`), these database calls physically **block the Python `asyncio` event loop**. The server hangs until the database responds, delaying the moment your code finally calls `llm.generate_stream()`.
* **The Fix:** You need to either switch to `AsyncSession` (SQLAlchemy async) OR wrap those specific synchronous database calls in `run_in_threadpool()` from FastAPI so they don't block the main event loop.

### 7. React Re-render Lag in Frontend
**Yes, you currently have a React Re-render Lag issue.**
Looking at `frontend/src/pages/ChatApp.tsx` lines 141-150:
```typescript
while (true) {
  // ... reading chunk
  setMessages(prev => { ... }) // TRIGGERING A RE-RENDER ON EVERY SINGLE TOKEN
}
```
You are calling React's `setState` for **every single chunk** that arrives over the network. Modern LLMs stream tokens incredibly fast (sometimes 50–100 chunks per second). Firing 100 React state updates per second forces your entire `ChatApp` tree to re-calculate and DOM diff repeatedly, which will freeze the browser tab on older devices or when the chat gets long.

* **Optimized Solution:** Instead of manual `fetch` loops, use the Vercel AI SDK (`npm install ai`). Their `useChat` hook is highly optimized under the hood to batch state updates and prevent UI thrashing during rapid streaming. If you want to keep your custom fetch loop, you should implement a `useRef` to accumulate the string and throttle the actual `setMessages` calls using `requestAnimationFrame` or a fast debounce (e.g., every 50ms).