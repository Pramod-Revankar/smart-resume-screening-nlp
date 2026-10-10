"""Safe upload handling: size cap, magic-byte check, temp file (never the client filename)."""
import os
import re
import tempfile
from pathlib import Path

from fastapi import HTTPException, UploadFile

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED = {".pdf": b"%PDF", ".docx": b"PK\x03\x04"}


def safe_display_name(filename: str | None) -> str:
    """Basename only, no path components or control characters (display/logging use only)."""
    base = Path((filename or "resume").replace("\\", "/")).name
    return re.sub(r"[^\w.\- ()]", "_", base)[:120] or "resume"


async def read_validated_upload(file: UploadFile) -> tuple[bytes, str, str]:
    """Return (content, extension, display_name) or raise a precise HTTPException."""
    name = safe_display_name(file.filename)
    ext = Path(name).suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(400, "Unsupported file format. Please upload a PDF or DOCX resume.")
    content = bytearray()
    while chunk := await file.read(1024 * 1024):
        content.extend(chunk)
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, f"File is too large. Maximum size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.")
    if not content:
        raise HTTPException(400, "The uploaded file is empty.")
    if not bytes(content[:4]).startswith(ALLOWED[ext]):
        raise HTTPException(422, f"The file does not look like a valid {ext[1:].upper()} document.")
    return bytes(content), ext, name


def extract_text_from_bytes(content: bytes, ext: str) -> str:
    from app.services.resume_parser import extract_resume_text

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(content)
        path = tmp.name
    try:
        text = extract_resume_text(path)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "The resume could not be read. The file may be corrupted or password-protected.")
    finally:
        try:
            os.remove(path)
        except OSError:
            pass
    if len(text.strip()) < 40:
        raise HTTPException(422, "No readable text was found in this resume. Scanned/image-only PDFs are not supported.")
    return text
