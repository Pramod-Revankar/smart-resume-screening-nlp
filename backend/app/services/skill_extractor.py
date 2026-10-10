"""Skill taxonomy + word-boundary-aware extraction.

Matching rules
* Longest alias first; matched spans are blanked so a shorter skill can never match INSIDE a longer
  one ("Java Script" -> javascript, and does NOT also produce java).
* Boundaries are custom ((?<![a-z0-9+#]) ... (?![a-z0-9+#])) so "javascript" never yields "java",
  "c++" never yields "c", and "node.js" is a single token.
* Single-letter languages (C, R) only match as list items, never as prose letters.
* IMPLIED: a resume that lists MySQL/PostgreSQL/... is credited with "sql" (one direction only).
"""
import re
from collections import defaultdict

# canonical -> aliases (canonical itself is always an alias)
TAXONOMY: dict[str, list[str]] = {
    "python": [], "java": [], "c++": ["cpp"], "c#": ["csharp", "c sharp"], "c": [], "r": [],
    "javascript": ["java script", "java-script", "js", "ecmascript", "es6"], "typescript": ["ts"],
    "php": [], "go": ["golang"], "kotlin": [], "swift": [], "ruby": [], "rust": [], "scala": [],
    "html": ["html5"], "css": ["css3"], "sass": ["scss"], "tailwind": ["tailwindcss", "tailwind css"],
    "bootstrap": [], "react": ["reactjs", "react.js", "react js"], "angular": ["angularjs"], "vue": ["vuejs", "vue.js"],
    "next.js": ["nextjs"], "node.js": ["nodejs", "node js"], "express": ["expressjs", "express.js"],
    "django": [], "flask": [], "fastapi": ["fast api"], "spring boot": ["springboot"], "spring": [],
    "laravel": [], "rest api": ["restful api", "rest apis", "restful apis", "rest"], "graphql": [],
    "sql": [], "mysql": [], "postgresql": ["postgres", "psql"], "sqlite": [], "mongodb": ["mongo db", "mongo"],
    "redis": [], "oracle": [], "firebase": [], "nosql": ["no sql"],
    "machine learning": ["ml"], "deep learning": ["dl"], "nlp": ["natural language processing"],
    "computer vision": [], "data analysis": ["data analytics"], "data science": [], "data visualization": ["data visualisation"],
    "pandas": [], "numpy": [], "scikit-learn": ["sklearn", "scikit learn"], "tensorflow": [], "keras": [], "pytorch": [],
    "xgboost": [], "random forest": [], "linear regression": [], "llm": ["large language model", "large language models"],
    "opencv": [], "power bi": ["powerbi"], "tableau": [], "excel": ["ms excel", "microsoft excel"],
    "docker": [], "kubernetes": ["k8s"], "aws": ["amazon web services"], "azure": [], "gcp": ["google cloud"],
    "git": [], "github": [], "linux": [], "ci/cd": ["cicd", "ci cd"], "jenkins": [],
    "frontend": ["front end", "front-end"], "backend": ["back end", "back-end"], "full stack": ["fullstack", "full-stack"],
    "agile": ["scrum"], "jira": [], "figma": [], "android": [], "flutter": [],
}
SKILL_LIST: list[str] = list(TAXONOMY.keys())  # kept for job_parser / legacy imports

# One-directional, genuine implications only (resume lists MySQL -> credited with SQL).
IMPLIES = {"mysql": ["sql"], "postgresql": ["sql"], "sqlite": ["sql"], "mongodb": ["nosql"]}

_STRICT_LIST_ITEM = {"c", "r", "go"}  # ambiguous tokens: only as list items, never as prose letters
# short/ambiguous ALIASES (not canonical names): honoured only near technical context words
_AMBIGUOUS_ALIASES = {"rest", "ml", "dl", "ts", "js", "mongo", "es6", "scrum", "psql"}
_CONTEXT = re.compile(r"skill|tech|stack|framework|language|tool|develop|api|web|learn|script|database|model", re.I)
_B = r"(?<![a-z0-9+#])"
_A = r"(?![a-z0-9+#])"


def _regex(alias: str, canonical: str) -> re.Pattern:
    body = re.escape(alias).replace("\\-", "[\\s\\-]?").replace("\\ ", "[\\s\\-]+")
    if canonical in _STRICT_LIST_ITEM and alias == canonical:
        return re.compile(r"(?:^|(?<=[\n,;:|/•·(]))[ \t]*(" + body + r")[ \t]*(?=$|[\n,;:|/•·)])", re.I | re.M)
    return re.compile(_B + "(" + body + ")" + _A, re.I)


_PATTERNS: list[tuple[int, str, str, re.Pattern]] = sorted(
    ((len(al), canon, al, _regex(al, canon)) for canon, aliases in TAXONOMY.items() for al in {canon, *aliases}),
    key=lambda t: -t[0],
)


_NOISE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+|(?:https?://|www\.)\S+|\b[\w-]+(?:\.[\w-]+)*\.(?:com|in|io|org|net|dev|ai|co)(?:/\S*)?", re.I)


def _blank_noise(text: str) -> str:
    """Blank URLs / emails (same length, so spans stay valid): 'github.com/x' is a link, not a skill."""
    return _NOISE.sub(lambda m: " " * len(m.group(0)), text)


def find_skill_spans(text: str) -> dict[str, list[tuple[int, int]]]:
    """canonical -> [(start, end)] spans in `text`. Longest alias first; matched spans are blanked so a
    shorter skill can never match inside a longer one ("Java Script" never yields "java")."""
    work = _blank_noise(text).lower()
    spans: dict[str, list[tuple[int, int]]] = defaultdict(list)
    for _, canon, alias, rx in _PATTERNS:
        for m in list(rx.finditer(work)):
            s, e = m.start(1), m.end(1)
            if alias in _AMBIGUOUS_ALIASES and alias != canon and not _CONTEXT.search(text[max(0, s - 30): e + 30]):
                continue
            spans[canon].append((s, e))
            work = work[:s] + " " * (e - s) + work[e:]
    return spans


def extract_skills(text: str) -> list[str]:
    if not text:
        return []
    found = set(find_skill_spans(text))
    for skill in list(found):
        found.update(IMPLIES.get(skill, []))
    return sorted(found)


DISPLAY = {
    "sql": "SQL", "mysql": "MySQL", "postgresql": "PostgreSQL", "mongodb": "MongoDB", "nosql": "NoSQL", "fastapi": "FastAPI",
    "aws": "AWS", "gcp": "GCP", "html": "HTML", "css": "CSS", "php": "PHP", "javascript": "JavaScript", "typescript": "TypeScript",
    "nlp": "NLP", "llm": "LLM", "node.js": "Node.js", "next.js": "Next.js", "ci/cd": "CI/CD", "rest api": "REST API", "power bi": "Power BI",
    "scikit-learn": "scikit-learn", "opencv": "OpenCV", "pytorch": "PyTorch", "tensorflow": "TensorFlow", "xgboost": "XGBoost",
    "c++": "C++", "c#": "C#", "graphql": "GraphQL", "github": "GitHub", "full stack": "Full stack", "frontend": "Frontend", "backend": "Backend",
}


def display_skill(skill: str) -> str:
    return DISPLAY.get(skill, skill.title())
