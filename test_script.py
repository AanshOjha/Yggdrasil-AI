import requests

API_URL = "http://localhost:8000/chat"
TOKEN = str(input("Enter bearer token:\n"))

CONVERSATION_ID = str(input("Enter conversation ID:\n"))

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

with open("30-questions.txt", "r", encoding="utf-8") as f:
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