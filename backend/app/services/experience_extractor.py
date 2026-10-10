"""Experience extraction: any section heading, many date formats, 'Present', overlapping periods merged."""
import re
from datetime import date

from app.services.section_parser import split_sections

_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}
_MON = r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
_PRESENT = r"(?:present|current|now|till\s+date|to\s+date|ongoing|till\s+now)"
_DASH = r"\s*(?:[–—\-]|to)\s*"
_P1 = re.compile(rf"\b({_MON})\.?\s*,?\s*((?:19|20)\d{{2}}){_DASH}(?:({_MON})\.?\s*,?\s*((?:19|20)\d{{2}})|({_PRESENT}))", re.I)
_P2 = re.compile(rf"\b(\d{{1,2}})\s*/\s*((?:19|20)\d{{2}}){_DASH}(?:(\d{{1,2}})\s*/\s*((?:19|20)\d{{2}})|({_PRESENT}))", re.I)
_P3 = re.compile(rf"\b((?:19|20)\d{{2}}){_DASH}(?:((?:19|20)\d{{2}})|({_PRESENT}))\b", re.I)


def _ym(y, m):
    return int(y) * 12 + int(m)


def _today_ym():
    t = date.today()
    return _ym(t.year, t.month)


def find_periods(line: str):
    """Yield (start_ym, end_ym, matched_text, precision) for date ranges in one line."""
    out, taken = [], []
    for m in _P1.finditer(line):
        s = _ym(m.group(2), _MONTHS[m.group(1)[:3].lower()])
        e = _today_ym() if m.group(5) else _ym(m.group(4), _MONTHS[m.group(3)[:3].lower()])
        out.append((s, e, m.group(0), "month")); taken.append(m.span())
    for m in _P2.finditer(line):
        if any(a <= m.start() < b for a, b in taken):
            continue
        s = _ym(m.group(2), min(max(int(m.group(1)), 1), 12))
        e = _today_ym() if m.group(5) else _ym(m.group(4), min(max(int(m.group(3)), 1), 12))
        out.append((s, e, m.group(0), "month")); taken.append(m.span())
    for m in _P3.finditer(line):
        if any(a <= m.start() < b for a, b in taken):
            continue
        s = _ym(m.group(1), 1)
        e = _today_ym() if m.group(3) else _ym(m.group(2), 12)
        out.append((s, e, m.group(0), "year"))
    return [(s, e, t, p) for s, e, t, p in out if e >= s]


def _merge(intervals):
    total, cur = 0, None
    for s, e in sorted(intervals):
        if cur and s <= cur[1]:
            cur[1] = max(cur[1], e)
        else:
            if cur:
                total += cur[1] - cur[0]
            cur = [s, e]
    if cur:
        total += cur[1] - cur[0]
    return total


def _fmt(ym):
    y, m = divmod(ym - 1, 12)
    return f"{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]} {y}"


def extract_experience(text: str) -> dict:
    lines = [l for l in split_sections(text).get("experience", [])]
    entries, intervals, last_header = [], [], ""
    for i, line in enumerate(lines):
        stripped = line.strip().lstrip("•·▪-– ").strip()
        periods = find_periods(line)
        if periods:
            s, e, matched, precision = periods[0]
            title = re.sub(r"\s*[|,–—\-]*\s*$", "", line.replace(matched, "")).strip(" |–—-,")
            if not title and last_header:
                title = last_header
            company, role = title, ""
            for sep in (" – ", " — ", " | ", " - ", ", "):
                if sep in title:
                    company, role = [x.strip() for x in title.split(sep, 1)]
                    break
            # month-level ranges are inclusive-exclusive like the original logic; year-only ranges are approximate
            months = max(0, e - s)
            intervals.append((s, e))
            entries.append({
                "title": title, "company": company, "role": role, "period": matched.strip(),
                "start": _fmt(s) if precision == "month" else str(s // 12), "end": "Present" if re.search(_PRESENT, matched, re.I) else (_fmt(e) if precision == "month" else str((e - 1) // 12)),
                "months": months, "precision": precision,
                "is_internship": bool(re.search(r"intern|trainee|apprentice", title, re.I)),
                "highlights": [],
            })
        elif entries and re.match(r"^\s*[•·▪\-]", line):
            entries[-1]["highlights"].append(stripped)
        elif entries and stripped and len(stripped) > 40 and not entries[-1]["highlights"]:
            entries[-1]["highlights"].append(stripped)
        elif entries and stripped and entries[-1]["highlights"]:
            # wrapped line of the previous bullet
            entries[-1]["highlights"][-1] = (entries[-1]["highlights"][-1] + " " + stripped).strip()
        elif stripped:
            last_header = stripped
    # bullets from PDFs are a lone "•" followed by text on the next line; clean empties
    for en in entries:
        en["highlights"] = [h for h in (h.strip("•·▪ ").strip() for h in en["highlights"]) if h]
    return {
        "experience_text": "\n".join(l for l in lines if l.strip()).strip(),
        "experience_months": _merge(intervals),
        "entries": entries,
    }
