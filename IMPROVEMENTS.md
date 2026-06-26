🔵 Offline / Evaluation Metrics (Zero App Code Changes)
These shouldn't be measured inside your main app code. Use external scripts or database queries.

7. Answer quality score

Method: "LLM-as-a-judge".
Create a simple Python script with 10-20 hardcoded question-answer pairs (your test set).
Have the script call your /chat API. Take your app's response and send it to a strong LLM (like GPT-4o or Gemini 1.5 Pro) with the prompt: "Grade this answer from 1 to 5 based on correctness and clarity."
8. Retrieval accuracy

Method: Extend the script from #7.
Instead of evaluating the final answer, evaluate the context chunks returned. Ask the judging LLM: "Does this context contain the information needed to answer the question? Yes or No."
9. Concurrent request capacity

Method: Use Locust (Python) or k6 (Javascript).
Write a 15-line script that simply sends a POST request to your /chat endpoint. Run locust in your terminal and tell it to simulate 50 users. It will automatically generate a nice web dashboard showing exactly when your app starts failing or slowing down.
10. Session retention

Method: Simple Database Query.
No code needed. Just run a SQL/MongoDB query counting how many sessions have more than a certain number of messages (e.g., > 3 interactions). Divide that by your total number of sessions.