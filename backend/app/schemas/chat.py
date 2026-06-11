from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from uuid import UUID

class ConversationBase(BaseModel):
    title: str

class ConversationCreate(BaseModel):
    pass # we can generate title "New Chat"

class ConversationResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ConversationRename(BaseModel):
    title: str

class MessageCreate(BaseModel):
    conversation_id: str
    message: str

class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
