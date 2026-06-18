from sqlalchemy.orm import Session
from app.models.conversation import Conversation
from app.models.message import Message

def create_conversation(db: Session, user_id: str, title: str = "New Chat"):
    conversation = Conversation(user_id=user_id, title=title)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation

def get_user_conversations(db: Session, user_id: str):
    return db.query(Conversation).filter(Conversation.user_id == user_id).order_by(Conversation.updated_at.desc()).all()

def rename_conversation(db: Session, conversation_id: str, user_id: str, new_title: str):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == user_id).first()
    if conversation:
        conversation.title = new_title
        db.commit()
        db.refresh(conversation)
    return conversation

def delete_conversation(db: Session, conversation_id: str, user_id: str):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == user_id).first()
    if conversation:
        db.delete(conversation)
        db.commit()
        return True
    return False

def add_message(db: Session, conversation_id: str, role: str, content: str):
    message = Message(conversation_id=conversation_id, role=role, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

def get_recent_messages(db: Session, conversation_id: str, limit: int = 20):
    # Get last N messages ordered by created_at ascending
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.desc()).limit(limit).all()
    # Reverse to return chronologically
    return messages[::-1]

def delete_message(db: Session, message_id: str):
    message = db.query(Message).filter(Message.id == message_id).first()
    if message:
        db.delete(message)
        db.commit()
        return True
    return False
