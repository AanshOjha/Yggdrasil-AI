from app.services import llm_service
from fastapi import APIRouter, Depends, UploadFile, File as FastAPIFile, HTTPException
from sqlalchemy.orm import Session
from openai import AsyncOpenAI
from app.db.database import get_db
from app.models.user import User
from app.models.file import File
from app.api.auth import get_current_user
import tempfile
import os

router = APIRouter(prefix="/files", tags=["files"])

@router.post("/upload")
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        provider = llm_service.LLMProvider()
        if provider.endpoint:
            client = AsyncOpenAI(
                base_url=provider.endpoint,
                api_key=provider.token_provider()
            )
        else:
            client = provider.client
        
        # Write to temp file to ensure compatibility with OpenAI SDK
        fd, temp_path = tempfile.mkstemp(suffix=f"_{file.filename}")
        try:
            with os.fdopen(fd, 'wb') as f:
                content = await file.read()
                f.write(content)
            
            # Upload to OpenAI
            with open(temp_path, "rb") as f:
                uploaded_file = await client.files.create(
                    file=f,
                    purpose="assistants"
                )
        finally:
            os.remove(temp_path)
        
        # Store in database
        db_file = File(
            user_id=current_user.id,
            filename=file.filename,
            openai_file_id=uploaded_file.id
        )
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        
        return {
            "id": str(db_file.id),
            "file_id": uploaded_file.id,
            "filename": db_file.filename
        }
    except Exception as e:
        print(f"Exception occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
def get_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    files = db.query(File).filter(File.user_id == current_user.id).order_by(File.created_at.desc()).all()
    return [{"id": str(f.id), "file_id": f.openai_file_id, "filename": f.filename} for f in files]
