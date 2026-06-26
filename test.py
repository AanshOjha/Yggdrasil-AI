import requests

API_URL = "http://localhost:8000/chat"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4N2M4YzdhZC1jZTI2LTQ0OGYtOWYzMi00NWFiMmFlNTgwODEiLCJleHAiOjE3ODMwODUxNTl9.zPWY4bGXBjA4I3aL61uEltgbl54r6FA9cdIRkbbwyB0"

CONVERSATION_ID = "c8d06291-77d6-4ddb-b8d8-5339008a9319"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

with open("questions.txt", "r", encoding="utf-8") as f:
    questions = [line.strip() for line in f if line.strip()]

print(f"Loaded {len(questions)} questions.\n")

for i, question in enumerate(questions, start=1):
    payload = {
        "conversation_id": CONVERSATION_ID,
        "message": question
    }

    try:
        response = requests.post(
            API_URL,
            headers=HEADERS,
            json=payload,
            timeout=120
        )

        print(f"[{i}/{len(questions)}] {response.status_code} - {question}")

        if response.status_code != 200:
            print(response.text)

    except Exception as e:
        print(f"[{i}] ERROR: {e}")

print("\nFinished sending all questions.")