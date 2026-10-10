def calculate_overall_score(
    skill_score,
    experience_score,
    education_score,
    ml_probability
):
    overall_score = (
        skill_score * 0.40
        + experience_score * 0.20
        + education_score * 0.15
        + ml_probability * 0.25
    )

    if overall_score >= 80:
        recommendation = "Strong Match"
    elif overall_score >= 60:
        recommendation = "Moderate Match"
    else:
        recommendation = "Weak Match"

    return {
        "overall_score": round(overall_score, 2),
        "recommendation": recommendation
    }