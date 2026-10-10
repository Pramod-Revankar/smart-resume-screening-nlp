import re

from app.services.experience_extractor import find_periods
from app.services.section_parser import split_sections
from app.services.skill_extractor import extract_skills

_BULLET = re.compile(r"^\s*[•·▪●○◦\-–*]\s*(.*)$")
_TECH = re.compile(r"^(technologies?|tech\s*stack|tools?|built\s+with|stack)(\s+used)?\s*[:\-]\s*(.+)$", re.I)
_ADDRESS_NOISE = re.compile(r"^[A-Za-z .]+,\s*[A-Za-z .]+,\s*[A-Za-z .]+$")


def project_lines(text: str) -> list[str]:
    """Legacy flat list of non-empty lines in the projects section."""
    return [l.strip() for l in split_sections(text).get("projects", []) if l.strip()]


def extract_projects(text: str) -> list[str]:
    return project_lines(text)


def extract_project_details(text: str) -> list[dict]:
    lines = [l.rstrip() for l in split_sections(text).get("projects", [])]
    projects: list[dict] = []
    cur: dict | None = None
    buf: list[str] | None = None  # current bullet being assembled
    expecting_title = True

    def flush():
        nonlocal buf
        if cur is not None and buf:
            cur["bullets"].append(" ".join(buf).strip())
        buf = None

    for raw in lines:
        s = raw.strip()
        if not s:
            continue
        b = _BULLET.match(s)
        tech = _TECH.match(b.group(1) if b else s)
        if tech and cur is not None:
            flush()
            cur["technologies"] = [t.strip(" .") for t in re.split(r"[,;/|]", tech.group(3)) if t.strip(" .")]
            expecting_title = True
            continue
        if b:
            flush()
            buf = [b.group(1)] if b.group(1) else []
            expecting_title = False
            continue
        if buf is not None and not (buf and buf[-1].endswith(".")):
            buf.append(s)  # wrapped continuation of a bullet
            continue
        if _ADDRESS_NOISE.match(s) and len(s.split()) <= 5:
            continue
        flush()
        if cur is not None and (cur["meta"] is None and ("|" in s or find_periods(s) or re.search(r"\b(19|20)\d{2}\b", s))) and not expecting_title:
            cur["meta"] = s
            continue
        if cur is not None and cur["meta"] is None and ("|" in s and re.search(r"\b(19|20)\d{2}\b", s)):
            cur["meta"] = s
            continue
        # new project title
        name, sub = s, ""
        for sep in (" – ", " — ", " - ", ": "):
            if sep in s:
                name, sub = [x.strip() for x in s.split(sep, 1)]
                break
        cur = {"name": name, "subtitle": sub, "meta": None, "bullets": [], "technologies": [], "institution": "", "year": ""}
        projects.append(cur)
        expecting_title = False
    flush()
    for p in projects:
        if p["meta"]:
            parts = [x.strip() for x in p["meta"].split("|")]
            p["institution"] = parts[0] if parts else ""
            ym = re.search(r"\b(?:19|20)\d{2}\b", p["meta"])
            p["year"] = ym.group(0) if ym else ""
        p["description"] = " ".join(p["bullets"])[:600]
        p["detected_skills"] = extract_skills(" ".join([p["name"], p["subtitle"], p["description"], " ".join(p["technologies"])]))
        p.pop("meta", None)
    return [p for p in projects if p["name"] and (p["bullets"] or p["technologies"])]
