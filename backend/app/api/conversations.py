from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.chat import ConversationResponse, ConversationCreate, ConversationRename
from app.services import conversation_service

router = APIRouter(prefix="/conversations", tags=["conversations"])

@router.post("", response_model=ConversationResponse)
def create_conversation(conv: ConversationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return conversation_service.create_conversation(db, user_id=current_user.id, title="New Chat")

@router.get("", response_model=List[ConversationResponse])
def get_conversations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return conversation_service.get_user_conversations(db, user_id=current_user.id)

@router.patch("/{conversation_id}", response_model=ConversationResponse)
def rename_conversation(conversation_id: str, conv: ConversationRename, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    updated = conversation_service.rename_conversation(db, conversation_id, current_user.id, conv.title)
    if not updated:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return updated

@router.delete("/{conversation_id}")
def delete_conversation(conversation_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    success = conversation_service.delete_conversation(db, conversation_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation deleted successfully"}
