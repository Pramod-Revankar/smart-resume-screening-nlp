from collections import defaultdict

from app.matching.education_matcher import calculate_education_match
from app.matching.experience_matcher import calculate_experience_match
from app.matching.skill_matcher import calculate_skill_match
from app.services.candidate_extractor import build_ml_prefill, extract_certifications, extract_identity
from app.services.education_extractor import education_lines, extract_education_details
from app.services.experience_extractor import extract_experience
from app.services.job_parser import extract_job_skills
from app.services.project_extractor import extract_project_details, project_lines
from app.services.section_parser import split_sections
from app.services.skill_extractor import IMPLIES, SKILL_LIST, display_skill, extract_skills, find_skill_spans

WEIGHTS = {"skills": 0.55, "experience": 0.25, "education": 0.20}
_STRONG_SECTIONS = {"experience", "projects", "certifications"}


def skill_evidence(text: str, skills: list[str]) -> dict:
    """Where each skill appears in the resume. This is evidence strength, not a proficiency rating."""
    per_section: dict[str, dict[str, int]] = defaultdict(dict)
    for name, lines in split_sections(text).items():
        for skill, spans in find_skill_spans("\n".join(lines)).items():
            per_section[skill][name] = len(spans)
    out = {}
    for skill in skills:
        src = per_section.get(skill)
        implied_from = None
        if not src:  # implied skill (e.g. SQL via MySQL)
            for k, v in IMPLIES.items():
                if skill in v and per_section.get(k):
                    src, implied_from = per_section[k], k
                    break
        src = src or {}
        mentions = sum(src.values())
        strong_where = [s for s in src if s in _STRONG_SECTIONS]
        level = "strong" if (len(strong_where) >= 2 or mentions >= 4) else "good" if (strong_where or mentions >= 2) else "listed"
        out[skill] = {"mentions": mentions, "sections": sorted(src), "strength": level, "implied_from": implied_from}
    return out


def analyze_resume(text, progress=None):
    emit = progress or (lambda *_: None)
    skills = extract_skills(text)
    emit("skills", {"count": len(skills)})
    experience = extract_experience(text)
    emit("experience", {"months": experience["experience_months"]})
    details = extract_education_details(text)
    emit("education", {"entries": len(details)})
    projects = extract_project_details(text)
    certs = extract_certifications(text)
    return {
        "skills": skills,
        "skill_evidence": skill_evidence(text, skills),
        "experience": experience,
        "education": education_lines(text),
        "education_details": details,
        "projects": project_lines(text),
        "project_details": projects,
        "certifications": certs,
        "candidate": extract_identity(text),
        "ml_prefill": build_ml_prefill(experience, details, projects, certs),
        "sections_found": sorted(k for k, v in split_sections(text).items() if k != "header" and any(x.strip() for x in v)),
    }


def _decision(label, skill_r, exp_r, edu_r, analysis, job_skills):
    reasons, positives = [], []
    if skill_r["missing_skills"]:
        reasons.append(f"Missing {len(skill_r['missing_skills'])} of {len(job_skills)} required skills: " + ", ".join(display_skill(x) for x in skill_r["missing_skills"]))
    if exp_r["experience_match_score"] < 100:
        gap = max(0, exp_r["required_experience_years"] * 12 - exp_r["resume_experience_months"])
        reasons.append(f"Experience is {gap} months below the {exp_r['required_experience_years']}-year requirement ({exp_r['resume_experience_months']} months found)")
    if not edu_r["education_match"]:
        reasons.append(f"Required degree ({edu_r['required_degree'].upper()}) not found in education")
    if skill_r["matched_skills"]:
        strong = [s for s in skill_r["matched_skills"] if analysis["skill_evidence"].get(s, {}).get("strength") == "strong"]
        positives.append(("Strong evidence for " + ", ".join(display_skill(x) for x in strong)) if strong else "Matches required skills: " + ", ".join(display_skill(x) for x in skill_r["matched_skills"]))
    if edu_r["education_match"]:
        positives.append(edu_r["note"])
    if exp_r["experience_match_score"] >= 100:
        positives.append("Meets or exceeds the experience requirement")
    if analysis["project_details"]:
        positives.append(f"{len(analysis['project_details'])} project(s) documented")
    return {"label": label, "primary_reasons": reasons, "positive_signals": positives}


def screen_resume(resume_text, job_description, required_experience_years, required_degree, progress=None):
    emit = progress or (lambda *_: None)
    analysis = analyze_resume(resume_text, progress)
    job_skills = extract_job_skills(job_description, SKILL_LIST)
    skill_result = calculate_skill_match(analysis["skills"], job_skills)
    experience_result = calculate_experience_match(analysis["experience"]["experience_months"], required_experience_years)
    education_result = calculate_education_match(analysis["education"], required_degree, analysis["education_details"])
    emit("matching", {"job_skills": len(job_skills)})

    match_score = (skill_result["match_score"] * WEIGHTS["skills"]
                   + experience_result["experience_match_score"] * WEIGHTS["experience"]
                   + education_result["education_match_score"] * WEIGHTS["education"])
    recommendation = "Strong Match" if match_score >= 80 else "Moderate Match" if match_score >= 60 else "Weak Match"
    emit("scoring", {"score": round(match_score, 2)})
    return {
        "resume_analysis": analysis,
        "job_skills": job_skills,
        "skill_match": {**skill_result, "details": [
            {"skill": s, "matched": s in analysis["skills"], "strength": analysis["skill_evidence"].get(s, {}).get("strength")}
            for s in job_skills]},
        "experience_match": experience_result,
        "education_match": education_result,
        "resume_job_match_score": round(match_score, 2),
        "recommendation": recommendation,
        "weights": WEIGHTS,
        "decision": _decision(recommendation, skill_result, experience_result, education_result, analysis, job_skills),
        "resume_text": resume_text,
    }
