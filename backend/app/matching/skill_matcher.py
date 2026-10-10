def calculate_skill_match(resume_skills, job_skills):

    if not job_skills:
        return {
            "matched_skills": [],
            "missing_skills": [],
            "match_score": 0
        }

    matched_skills = [
        skill for skill in job_skills
        if skill in resume_skills
    ]

    missing_skills = [
        skill for skill in job_skills
        if skill not in resume_skills
    ]

    match_score = (
        len(matched_skills) / len(job_skills)
    ) * 100

    return {
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "match_score": round(match_score, 2)
    }