from app.services.skill_extractor import find_skill_spans


def extract_job_skills(text, skill_list=None):
    """Skills a job description asks for (no implication: asking for MySQL does not also demand SQL)."""
    spans = find_skill_spans(text or "")
    # report in order of first appearance in the JD
    return sorted(spans, key=lambda s: min(a for a, _ in spans[s]))
