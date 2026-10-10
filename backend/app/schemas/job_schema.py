from pydantic import BaseModel, Field


class JobMatchInput(BaseModel):
    job_description: str = Field(min_length=3, max_length=20000)
    resume_skills: list[str] = Field(max_length=300)
