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

from app.services.metrics_service import metrics_tracker
from pydantic import BaseModel

class AccuracyUpdate(BaseModel):
    accuracy: float

@app.get("/api/dashboard/metrics")
async def get_dashboard_metrics():
    return await metrics_tracker.get_dashboard_stats()

@app.post("/api/dashboard/reset")
async def reset_dashboard_metrics():
    await metrics_tracker.reset_metrics()
    return {"status": "success"}

@app.post("/api/metrics/accuracy")
async def update_accuracy(data: AccuracyUpdate):
    await metrics_tracker.record_retrieval_accuracy(data.accuracy)
    return {"status": "success", "accuracy": data.accuracy}

@app.get("/")
def root():
    return {"message": "Welcome to Yggdrasil AI API"}
