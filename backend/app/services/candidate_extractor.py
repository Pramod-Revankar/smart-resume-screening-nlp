"""Identity, certifications and ML-form prefill derived from the resume."""
import re

from app.ml.artifacts import CATEGORIES
from app.services.section_parser import split_sections

_EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
_PHONE = re.compile(r"(?:\+?\d{1,3}[\s\-]?)?(?:\(?\d{3,5}\)?[\s\-]?)?\d{3,5}[\s\-]?\d{4,5}")
_LINKEDIN = re.compile(r"(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com/(?:in|pub)/[A-Za-z0-9\-_%]+/?", re.I)
_GITHUB = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[A-Za-z0-9\-_]+", re.I)


def extract_identity(text: str) -> dict:
    head = split_sections(text)["header"]
    block = "\n".join(head) if head else text[:600]
    email = _EMAIL.search(text)
    li, gh = _LINKEDIN.search(text), _GITHUB.search(text)
    phone = None
    for m in _PHONE.finditer(block):
        digits = re.sub(r"\D", "", m.group(0))
        if 10 <= len(digits) <= 13:
            phone = m.group(0).strip(); break
    name = None
    for line in head[:8]:
        s = line.strip()
        if not s or _EMAIL.search(s) or re.search(r"\d|http|linkedin|github|@", s, re.I):
            continue
        if 1 <= len(s.split()) <= 5 and re.fullmatch(r"[A-Za-z .'\-]+", s):
            name = " ".join(w.capitalize() if w.isupper() and len(w) > 1 else w for w in s.split())
            break
    norm = lambda u: None if not u else (u if u.startswith("http") else "https://" + u.rstrip("/"))
    return {"name": name, "email": email.group(0) if email else None, "phone": phone,
            "linkedin": norm(li.group(0)) if li else None, "github": norm(gh.group(0)) if gh else None}


def extract_certifications(text: str) -> list[str]:
    out, buf = [], None
    for raw in split_sections(text).get("certifications", []):
        s = raw.strip()
        if not s:
            continue
        if re.match(r"^[•·▪●○◦\-–*]\s*", s) or s in ("•", "·"):
            if buf: out.append(buf.strip())
            buf = re.sub(r"^[•·▪●○◦\-–*]\s*", "", s)
        else:
            buf = (buf + " " + s) if buf is not None else s
    if buf and buf.strip():
        out.append(buf.strip())
    return [c for c in (re.sub(r"\s+", " ", c) for c in out) if len(c) > 2]


_SPEC_HINTS = [("artificial intelligence", "Artificial Intelligence"), ("data science", "Data Science"),
               ("business analytics", "Business Analytics"), ("cyber", "Cybersecurity"), ("information technology", "Information Technology"),
               ("computer", "Computer Science"), ("statistics", "Statistics"), ("mathematics", "Mathematics"),
               ("electronics", "Electronics"), ("electrical", "Electrical"), ("mechanical", "Mechanical"), ("civil", "Civil")]


def build_ml_prefill(experience: dict, education_details: list[dict], project_details: list[dict], certifications: list[str]) -> dict:
    """Only values that can be read off the resume. Skill ratings, salary, age, gender, etc. are NOT guessed."""
    prefill: dict[str, dict] = {}
    degrees = [e for e in education_details if e["level"] >= 3]
    top = max(degrees, key=lambda e: e["level"], default=None)
    if top and top["code"] in CATEGORIES["degree"]:
        prefill["degree"] = {"value": top["code"], "source": "highest degree found in Education"}
        low = top["degree"].lower()
        for hint, spec in _SPEC_HINTS:
            if hint in low:
                prefill["specialization"] = {"value": spec, "source": f"inferred from “{top['degree']}” — please verify", "suggested": True}
                break
    cg = next((e for e in sorted(degrees, key=lambda e: -e["level"]) if e["score_type"] == "CGPA" and e["score"] is not None), None)
    if cg:
        val = cg["score"] if (cg["score_scale"] or 10) == 10 else round(cg["score"] / cg["score_scale"] * 10, 2)
        prefill["cgpa"] = {"value": round(val, 2), "source": f"CGPA listed for {cg['code']}"}
    entries = experience.get("entries", [])
    non_intern = [e for e in entries if not e["is_internship"]]
    prefill["internships_count"] = {"value": sum(1 for e in entries if e["is_internship"]), "source": "internship entries in Experience"}
    prefill["years_experience"] = {"value": int(sum(e["months"] for e in non_intern) // 12), "source": "full-time (non-internship) months ÷ 12"}
    prefill["projects_count"] = {"value": len(project_details), "source": "project entries found"}
    prefill["certifications_count"] = {"value": len(certifications), "source": "certification entries found"}
    return prefill
