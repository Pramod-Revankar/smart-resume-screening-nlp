"""Layout-tolerant resume section splitter (headings on their own line, any casing)."""
import re

_HEADINGS = {
    "summary": r"(career\s+)?objective|(professional\s+)?summary|profile|about\s+me|career\s+summary",
    "education": r"education(al)?(\s+(details|background|qualifications?))?|academic\s+(background|qualifications?|details)|qualifications?",
    "experience": r"(internship\s*(/|&|and)\s*)?(work|professional|relevant|industry)?\s*experience|internships?(\s+experience)?|employment(\s+history)?|work\s+history|internship\s*(/|&|and)\s*work\s+experience",
    "projects": r"(academic|personal|key|major|notable|selected)?\s*projects?(\s+work)?",
    "skills": r"(technical\s+|key\s+|core\s+)?skills?(\s*(&|and)\s*tools?)?|core\s+competenc(y|ies)|technical\s+proficiency|tech\s+stack",
    "certifications": r"(licen[sc]es\s*(&|and)\s*)?certifications?|certificates?|courses|training(s)?",
    "achievements": r"achievements?|awards?(\s*(&|and)\s*honou?rs)?|honou?rs|accomplishments",
    "additional": r"additional\s+information|languages?|interests?|hobbies|references?|declaration|personal\s+details",
}
_COMPILED = {k: re.compile(rf"^\s*(?:{v})\s*[:\-–]?\s*$", re.I) for k, v in _HEADINGS.items()}


def heading_of(line: str):
    s = line.strip().strip("•·▪-–:").strip()
    if not s or len(s.split()) > 6 or len(s) > 48:
        return None
    for key, rx in _COMPILED.items():
        if rx.match(s):
            return key
    return None


def split_sections(text: str) -> dict:
    """Return {"header": [...lines], "education": [...], ...}; first occurrence of a heading wins its body."""
    sections: dict[str, list[str]] = {"header": []}
    current = "header"
    for raw in text.replace("\r", "").split("\n"):
        key = heading_of(raw)
        if key:
            current = key
            sections.setdefault(current, [])
            continue
        sections.setdefault(current, []).append(raw.rstrip())
    return sections
