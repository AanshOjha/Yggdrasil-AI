from sqlalchemy import Column, String, DateTime, ForeignKey
from datetime import datetime
import uuid
from sqlalchemy.orm import relationship
from app.models.base import Base

from sqlalchemy.dialects.postgresql import UUID

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
