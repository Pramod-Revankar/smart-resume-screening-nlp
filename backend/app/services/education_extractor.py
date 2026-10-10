import re

from app.services.degree_utils import classify_degree
from app.services.experience_extractor import find_periods
from app.services.section_parser import split_sections

_INST = re.compile(r"college|university|institute|school|academy|polytechnic|iit|nit|iiit|vidyalaya|convent", re.I)
_SCORE = re.compile(r"(cgpa|gpa|percentage|percent|marks|score)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:/\s*(\d+(?:\.\d+)?)|%)?", re.I)
_PCT_ONLY = re.compile(r"(\d{2,3}(?:\.\d+)?)\s*%")


def education_lines(text: str) -> list[str]:
    """Legacy flat list of non-empty lines in the education section."""
    return [l.strip() for l in split_sections(text).get("education", []) if l.strip()]


def extract_education(text: str) -> list[str]:
    return education_lines(text)


def extract_education_details(text: str) -> list[dict]:
    entries: list[dict] = []
    for raw in split_sections(text).get("education", []):
        line = raw.strip().lstrip("•·▪ ").strip()
        if not line:
            continue
        cls = classify_degree(line)
        periods = find_periods(line)
        score = _SCORE.search(line)
        is_new = cls is not None and (not entries or cls[0] != entries[-1].get("code") or entries[-1].get("_closed"))
        # a degree word inside an institution line ("... Institute of Technology") should not open an entry
        if is_new and entries and _INST.search(line) and not re.match(r"^(master|bachelor|b\.?|m\.?|class|diploma|ph)", line, re.I):
            is_new = False
        if is_new:
            entries.append({"degree": re.sub(r"\s*\|.*$", "", line).strip(), "code": cls[0], "level": cls[1],
                            "institution": "", "start": None, "end": None, "score": None, "score_type": None,
                            "score_scale": None})
            if cls[1] is not None and len(entries) > 1:
                entries[-2]["_closed"] = True
        if not entries:
            continue
        cur = entries[-1]
        if periods and cur["start"] is None:
            s, e, matched, prec = periods[0]
            cur["start"] = str(s // 12)
            cur["end"] = "Present" if re.search(r"present|current|now|ongoing|till", matched, re.I) else str((e - 1) // 12 if prec == "month" else e // 12 if e % 12 else e // 12 - 1)
            if prec == "year":
                cur["end"] = "Present" if cur["end"] == "Present" else str(int(matched.split()[-1]) if matched.split()[-1].isdigit() else cur["end"])
        if score and cur["score"] is None:
            val = float(score.group(2)); kind = score.group(1).lower()
            cur["score_type"] = "CGPA" if kind in ("cgpa", "gpa") else "Percentage"
            cur["score"] = val
            cur["score_scale"] = float(score.group(3)) if score.group(3) else (100.0 if cur["score_type"] == "Percentage" else 10.0)
        elif cur["score"] is None and not cls:
            pm = _PCT_ONLY.search(line)
            if pm:
                cur["score_type"], cur["score"], cur["score_scale"] = "Percentage", float(pm.group(1)), 100.0
        if _INST.search(line) and not cur["institution"] and not (is_new and cls):
            cur["institution"] = re.sub(r"\s*\|.*$", "", line).strip()
    for e in entries:
        e.pop("_closed", None)
    return entries
