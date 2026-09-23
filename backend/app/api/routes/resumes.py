from pathlib import Path
from uuid import uuid4

from docx import Document
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pypdf import PdfReader

from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/resumes", tags=["resumes"])
ALLOWED_TYPES = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"}
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def extract_text(path: Path, extension: str) -> str:
    if extension == ".pdf":
        return "\n".join(page.extract_text() or "" for page in PdfReader(path).pages).strip()
    if extension == ".docx":
        document = Document(path)
        return "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
    return path.read_text(encoding="utf-8", errors="replace").strip()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> dict[str, str | int]:
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS or (file.content_type and file.content_type not in ALLOWED_TYPES):
        raise HTTPException(status_code=415, detail="Only PDF, DOCX, and TXT files are supported")

    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File must be smaller than {settings.max_upload_size_mb} MB")

    upload_dir = Path(settings.upload_dir) / str(user.id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored_path = upload_dir / f"{uuid4()}{extension}"
    stored_path.write_bytes(content)

    try:
        text = extract_text(stored_path, extension)
    except Exception as exc:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="Unable to extract text from this file") from exc

    if not text:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="No readable text was found in this resume")

    return {"filename": file.filename or stored_path.name, "characters": len(text), "text": text}
