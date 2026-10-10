import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.controllers.analysis_controller import screen_resume
from app.schemas.analysis_schema import ScreeningInput
from app.utils.file_utils import extract_text_from_bytes, read_validated_upload
from app.utils.validators import validate_screening_inputs

router = APIRouter()


@router.post("/screen")
def screen_resume_json(data: ScreeningInput):
    jd, years, degree = validate_screening_inputs(data.job_description, data.required_experience_years, data.required_degree)
    if len(data.resume_text.strip()) < 40:
        raise HTTPException(422, "Resume text is too short to analyse.")
    return {"status": "success", "screening": screen_resume(data.resume_text, jd, years, degree)}


@router.post("/screen-upload")
async def screen_uploaded_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    required_experience_years: int = Form(...),
    required_degree: str = Form(...),
):
    jd, years, degree = validate_screening_inputs(job_description, required_experience_years, required_degree)
    content, ext, name = await read_validated_upload(file)
    text = extract_text_from_bytes(content, ext)
    return {"filename": name, "screening": screen_resume(text, jd, years, degree)}


@router.post("/screen-upload-stream")
async def screen_uploaded_resume_stream(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    required_experience_years: int = Form(...),
    required_degree: str = Form(...),
):
    """Same work as /screen-upload, reported as NDJSON events as each REAL stage completes
    (no artificial delays). Validation errors are raised before streaming starts."""
    jd, years, degree = validate_screening_inputs(job_description, required_experience_years, required_degree)
    content, ext, name = await read_validated_upload(file)

    def events():
        def ev(stage, data=None):
            return json.dumps({"stage": stage, **(data or {})}) + "\n"

        yield ev("received", {"filename": name, "bytes": len(content)})
        try:
            text = extract_text_from_bytes(content, ext)
        except HTTPException as exc:
            yield json.dumps({"error": exc.detail, "status": exc.status_code}) + "\n"
            return
        yield ev("extracted", {"characters": len(text)})
        log: list[tuple[str, dict]] = []
        try:
            result = screen_resume(text, jd, years, degree, progress=lambda s, d=None: log.append((s, d or {})))
        except Exception:  # never leak internals
            yield json.dumps({"error": "Screening failed unexpectedly.", "status": 500}) + "\n"
            return
        for stage, data in log:
            yield ev(stage, data)
        yield json.dumps({"stage": "done", "filename": name, "screening": result}) + "\n"

    return StreamingResponse(events(), media_type="application/x-ndjson")
