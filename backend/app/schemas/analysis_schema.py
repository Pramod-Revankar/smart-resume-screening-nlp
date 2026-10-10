from pydantic import BaseModel, Field


class ScreeningInput(BaseModel):
    resume_text: str = Field(max_length=200_000)
    job_description: str
    required_experience_years: int
    required_degree: str
