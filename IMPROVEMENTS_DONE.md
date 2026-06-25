1. Replaced the unoptimized manual streaming loop with Vercel's useChat hook, which batches state updates and eliminates the severe React re-render freezing that was bottlenecking your browser.

2. Wrapped synchronous database calls in `chat.py` with `run_in_threadpool()` from FastAPI to prevent them from blocking the `asyncio` event loop. This improves Time To First Token (TTFT).