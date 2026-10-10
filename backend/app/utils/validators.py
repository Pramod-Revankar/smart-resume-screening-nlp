from fastapi import HTTPException

MAX_JD_CHARS = 20000


def validate_screening_inputs(job_description: str, required_experience_years: int, required_degree: str):
    jd = (job_description or "").strip()
    if len(jd) < 20:
        raise HTTPException(422, "Please provide a job description (at least 20 characters).")
    if len(jd) > MAX_JD_CHARS:
        raise HTTPException(422, f"Job description is too long (max {MAX_JD_CHARS} characters).")
    if not 0 <= required_experience_years <= 40:
        raise HTTPException(422, "Required experience must be between 0 and 40 years.")
    if not (required_degree or "").strip():
        raise HTTPException(422, "Required degree is required (e.g. MCA, B.Tech).")
    return jd, int(required_experience_years), required_degree.strip()
