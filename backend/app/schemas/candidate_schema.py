"""Validated input schema for /model/predict.

* Categorical values are matched case/space-insensitively against the categories the
  saved preprocessor was fitted on, then canonicalised ("tier 1" -> "Tier 1").
  Unknown values are REJECTED (422) instead of being silently zero-encoded.
* Numeric values are range-checked against plausible human bounds and never coerced.
* Skill ratings use the 1-10 scale of the training data.
"""
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.ml.artifacts import CATEGORIES


def _canon(feature: str, value: str) -> str:
    key = " ".join(str(value).split()).casefold()
    for option in CATEGORIES[feature]:
        if option.casefold() == key:
            return option
    allowed = ", ".join(CATEGORIES[feature])
    raise ValueError(f"'{value}' is not a known {feature}. Allowed values: {allowed}")


class CandidateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    age: int = Field(ge=18, le=65, description="Years")
    gender: str
    degree: str
    specialization: str
    university_tier: str
    cgpa: float = Field(ge=0, le=10)
    years_experience: int = Field(ge=0, le=50)
    internships_count: int = Field(ge=0, le=50)
    projects_count: int = Field(ge=0, le=100)
    certifications_count: int = Field(ge=0, le=100)
    python_skill: int = Field(ge=1, le=10, description="Self/assessed rating 1-10")
    sql_skill: int = Field(ge=1, le=10)
    machine_learning_skill: int = Field(ge=1, le=10)
    deep_learning_skill: int = Field(ge=1, le=10)
    communication_skill: int = Field(ge=1, le=10)
    leadership_skill: int = Field(ge=1, le=10)
    github_projects: int = Field(ge=0, le=200)
    kaggle_activity_score: float = Field(ge=0, le=10, description="0-10 activity score")
    hackathons_participated: int = Field(ge=0, le=100)
    expected_salary_lpa: float = Field(ge=0, le=200)
    location: str
    employment_gap_months: int = Field(ge=0, le=240)

    @field_validator("gender", "degree", "specialization", "university_tier", "location", mode="before")
    @classmethod
    def _categorical(cls, v, info):
        if not isinstance(v, str) or not v.strip():
            raise ValueError(f"{info.field_name} is required")
        return _canon(info.field_name, v)
