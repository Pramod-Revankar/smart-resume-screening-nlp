from app.services.degree_utils import classify_degree, split_required


def calculate_education_match(resume_education, required_degree, education_details=None):
    """Meets the requirement if the candidate holds the required degree, or a higher degree in the same track.
    `resume_education` (list of lines) is kept for backwards compatibility."""
    wanted = [classify_degree(p) or (None, None, None) for p in split_required(required_degree)]
    wanted_named = [(p, c) for p, c in zip(split_required(required_degree), wanted)]
    held = []
    for e in education_details or []:
        if e.get("code"):
            held.append((e["code"], e["level"], classify_degree(e["code"] + " ")[2] if classify_degree(e["code"] + " ") else None))
    if not held:  # fall back to raw lines
        for line in resume_education or []:
            c = classify_degree(line)
            if c:
                held.append(c)
    matched_degree, note = None, None
    for raw, (code, level, track) in wanted_named:
        if code is None:  # unknown requirement text: plain substring fallback
            if raw.lower() in " ".join(resume_education or []).lower():
                matched_degree, note = raw, "Required qualification found in education"
            continue
        for h_code, h_level, h_track in held:
            if h_code == code or (h_track == track and h_level >= level):
                matched_degree = h_code
                note = "Exact degree match" if h_code == code else f"{h_code} is a higher qualification in the same track as {code}"
                break
        if matched_degree:
            break
    return {
        "required_degree": (required_degree or "").lower(),
        "education_match": bool(matched_degree),
        "education_match_score": 100 if matched_degree else 0,
        "matched_degree": matched_degree,
        "note": note or "Required degree not found in the candidate's education",
    }
