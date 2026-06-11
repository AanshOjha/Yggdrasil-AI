# Yggdrasil AI 🌳

Yggdrasil AI is a modern, full-stack AI chat application featuring a sleek React frontend and a powerful FastAPI backend, powered by state-of-the-art LLMs (like Google's Gemini).

## 🚀 Features

- **Conversational AI**: Engage in seamless, context-aware conversations with an advanced LLM.
- **User Authentication**: Secure user registration and login system with session management.
- **Chat History**: Save and organize multiple conversation threads.
- **Modern UI/UX**: A beautiful, responsive frontend built with React, Vite, and modern CSS.
- **Robust Backend**: High-performance asynchronous backend powered by FastAPI and SQLAlchemy.

## 🛠️ Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- Context API (Auth & State Management)

**Backend:**
- Python 3.x
- FastAPI
- SQLAlchemy & Alembic (PostgreSQL / SQLite)
- Uvicorn (ASGI server)

## ⚙️ How to Run Locally

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/AanshOjha/Yggdrasil-AI.git
cd Yggdrasil-AI
```

### 2. Backend Setup
Navigate to the backend directory and set up the Python environment:
```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate

# Install dependencies (assuming you have a requirements.txt)
pip install -r requirements.txt
```

**Environment Variables:**
Create a `.env` file in the `backend/` directory and configure your secrets.
```env
# Example backend/.env
AZURE_ENDPOINT=
AZURE_TOKEN_PROVIDER=
DEPLOYMENT_NAME=
SECRET_KEY=
DATABASE_URL=
```

**Start the PostgreSQL Database (Docker):**
We provide a `docker-compose.yml` to easily spin up a PostgreSQL instance.
```bash
cd backend
docker-compose up -d
```
This starts PostgreSQL on port `5432` (User: `yggdrasil`, Password: `password123`, DB: `yggdrasil`).
*Note: Make sure to set `DATABASE_URL=postgresql://yggdrasil:password123@localhost:5432/yggdrasil` in your `.env`.*

**Run Database Migrations (if applicable):**
```bash
alembic upgrade head
```

**Start the Backend Server:**
```bash
cd backend
uvicorn app.main:app --reload
```
The backend will be running at `http://localhost:8000`. You can view the interactive API docs at `http://localhost:8000/docs`.

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory:
```bash
cd frontend

# Install dependencies
npm install
```

**Start the Frontend Development Server:**
```bash
npm run dev
```
The frontend will typically be running at `http://localhost:5173`. Open this URL in your browser to start using Yggdrasil AI!

It assumes backend is running at `http://localhost:8000`

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/AanshOjha/Yggdrasil-AI/issues).

## 📄 License
This project is licensed under the MIT License.
