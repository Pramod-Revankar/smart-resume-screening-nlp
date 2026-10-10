"""Degree normalisation: free text -> (code, level, track)."""
import re

# (regex, code, level, track)   level: 1 school, 2 diploma, 3 bachelor, 4 master, 5 doctorate
_DEGREES = [
    (r"master\s+of\s+computer\s+applications?|\bm\.?\s?c\.?\s?a\b", "MCA", 4, "apps"),
    (r"bachelor\s+of\s+computer\s+applications?|\bb\.?\s?c\.?\s?a\b", "BCA", 3, "apps"),
    (r"master\s+of\s+technology|\bm\.?\s?tech\b", "M.Tech", 4, "eng"),
    (r"bachelor\s+of\s+technology|\bb\.?\s?tech\b", "B.Tech", 3, "eng"),
    (r"bachelor\s+of\s+engineering|\bb\.?\s?e\.?(?=\s|$|,|\()", "B.E.", 3, "eng"),
    (r"master\s+of\s+business\s+administration|\bm\.?\s?b\.?\s?a\b", "MBA", 4, "biz"),
    (r"bachelor\s+of\s+business\s+administration|\bb\.?\s?b\.?\s?a\b", "BBA", 3, "biz"),
    (r"master\s+of\s+science|\bm\.?\s?sc\b", "M.Sc", 4, "sci"),
    (r"bachelor\s+of\s+science|\bb\.?\s?sc\b", "B.Sc", 3, "sci"),
    (r"bachelor\s+of\s+commerce|\bb\.?\s?com\b", "B.Com", 3, "com"),
    (r"doctor\s+of\s+philosophy|\bph\.?\s?d\b", "Ph.D", 5, "phd"),
    (r"\bdiploma\b", "Diploma", 2, "diploma"),
    (r"class\s*(xii|12)|\b12th\b|\bhsc\b|intermediate|\bpu\s*c\b|puc|higher\s+secondary", "Class XII", 1, "school"),
    (r"class\s*(x|10)\b|\b10th\b|\bsslc\b|\bssc\b|secondary\s+school", "Class X", 1, "school"),
]
_COMPILED = [(re.compile(p, re.I), c, l, t) for p, c, l, t in _DEGREES]


def classify_degree(text: str):
    """Return (code, level, track) or None."""
    for rx, code, level, track in _COMPILED:
        if rx.search(text or ""):
            return code, level, track
    return None


def split_required(required: str) -> list[str]:
    return [p.strip() for p in re.split(r"\s*(?:/|,|;|\bor\b|\band\b|\|)\s*", required or "", flags=re.I) if p.strip()]
