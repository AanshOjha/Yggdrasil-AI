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

ACCEPTED_EXTENSIONS = {
    ".art", ".bat", ".brf", ".c", ".cls", ".css", ".csv", ".diff", ".doc", ".docx",
    ".dot", ".eml", ".es", ".h", ".hs", ".htm", ".html", ".hwp", ".hwpx", ".ics",
    ".ifb", ".java", ".js", ".json", ".keynote", ".ksh", ".ltx", ".mail", ".markdown",
    ".md", ".mht", ".mhtml", ".mjs", ".nws", ".odt", ".pages", ".patch", ".pdf",
    ".pl", ".pm", ".pot", ".ppa", ".pps", ".ppt", ".pptx", ".pwz", ".py", ".rst",
    ".rtf", ".scala", ".sh", ".shtml", ".srt", ".sty", ".svg", ".svgz", ".tex",
    ".text", ".txt", ".tsv", ".vcf", ".vtt", ".wiz", ".xla", ".xlb", ".xlc", ".xlm",
    ".xls", ".xlsx", ".xlt", ".xlw", ".xml", ".yaml", ".yml",
    ".png", ".jpg", ".jpeg", ".webp", ".gif"
}

@router.post("/upload")
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ACCEPTED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported file format: {ext}")
            
        provider = llm_service.LLMProvider()
        client = provider._get_client()
        
        # Write to temp file to ensure compatibility with OpenAI SDK
        fd, temp_path = tempfile.mkstemp(suffix=f"_{file.filename}")
        try:
            with os.fdopen(fd, 'wb') as f:
                content = await file.read()
                f.write(content)
            
            # Lazily create vector store if needed
            if not current_user.vector_store_id:
                vector_store = await client.vector_stores.create(
                    name=f"knowledge_base_{current_user.id}"
                )
                current_user.vector_store_id = vector_store.id
                db.add(current_user)
                db.commit()

            # Upload to OpenAI
            with open(temp_path, "rb") as f:
                uploaded_file = await client.files.create(
                    file=f,
                    purpose="assistants"
                )
            
            # Attach the file to the vector store
            await client.vector_stores.files.create(
                vector_store_id=current_user.vector_store_id,
                file_id=uploaded_file.id
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
