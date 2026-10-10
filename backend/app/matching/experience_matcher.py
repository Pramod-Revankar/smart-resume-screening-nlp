def calculate_experience_match(
    resume_experience_months,
    required_experience_years
):
    required_months = required_experience_years * 12

    if required_months == 0:
        score = 100
    else:
        score = min(
            (resume_experience_months / required_months) * 100,
            100
        )

    return {
        "required_experience_years": required_experience_years,
        "resume_experience_months": resume_experience_months,
        "experience_match_score": round(score, 2)
    }