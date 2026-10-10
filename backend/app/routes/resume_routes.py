from fastapi import APIRouter, File, UploadFile

from app.controllers.analysis_controller import analyze_resume
from app.utils.file_utils import extract_text_from_bytes, read_validated_upload

router = APIRouter()


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    """Parse and analyse a resume. The file is processed in a temp file and discarded."""
    content, ext, name = await read_validated_upload(file)
    text = extract_text_from_bytes(content, ext)
    return {"filename": name, "analysis": analyze_resume(text), "text": text}
