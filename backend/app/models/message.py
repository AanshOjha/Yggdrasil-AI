from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from datetime import datetime
import uuid
from sqlalchemy.orm import relationship
from app.models.base import Base

from sqlalchemy.dialects.postgresql import UUID

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False) # user, assistant, system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
