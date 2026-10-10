from app.services.job_parser import extract_job_skills
from app.services.skill_extractor import SKILL_LIST
from app.matching.skill_matcher import calculate_skill_match


def match_resume_to_job(job_description, resume_skills):

    job_skills = extract_job_skills(
        job_description,
        SKILL_LIST
    )

    return {
        "job_skills": job_skills,
        "match": calculate_skill_match(
            resume_skills,
            job_skills
        )
    }