from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, conversations, chat, files
from app.db.database import engine
from app.models.base import Base

# Create database tables 
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Yggdrasil AI Backend")

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(conversations.router)
app.include_router(chat.router)
app.include_router(files.router)

from app.services import llm_service

@app.get("/api/stats")
def get_stats():
    return {"openai_calls": llm_service.openai_call_count}

@app.get("/")
def root():
    return {"message": "Welcome to Yggdrasil AI API"}
