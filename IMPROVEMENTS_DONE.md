1. Replaced the unoptimized manual streaming loop with Vercel's useChat hook, which batches state updates and eliminates the severe React re-render freezing that was bottlenecking your browser.

2. 