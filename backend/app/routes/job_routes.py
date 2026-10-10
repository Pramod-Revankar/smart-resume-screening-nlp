from fastapi import APIRouter

from app.controllers.job_controller import match_resume_to_job
from app.schemas.job_schema import JobMatchInput

router = APIRouter()


@router.post("/match")
def match_job(data: JobMatchInput):
    return match_resume_to_job(data.job_description, data.resume_skills)
