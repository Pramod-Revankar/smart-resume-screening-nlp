"""Backend test-suite. Run from backend/:   python -m pytest tests -q"""
import io, sys, warnings
from pathlib import Path

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from docx import Document
from fastapi.testclient import TestClient

from app.main import app
from app.services.skill_extractor import extract_skills

client = TestClient(app)
ROOT = Path(__file__).resolve().parents[2]
SAMPLE_PDF = ROOT / "data" / "resumes" / "Pramodresumeplacement .pdf"
JD = "Full stack Python developer with SQL, Machine Learning, FastAPI, MongoDB and Docker experience."

GOOD = dict(age=24, gender="Male", degree="B.Tech", specialization="Computer Science", university_tier="Tier 1",
            cgpa=8.5, years_experience=2, internships_count=2, projects_count=4, certifications_count=2,
            python_skill=7, sql_skill=6, machine_learning_skill=6, deep_learning_skill=5, communication_skill=6,
            leadership_skill=5, github_projects=3, kaggle_activity_score=5.7, hackathons_participated=2,
            expected_salary_lpa=18.0, location="Bangalore", employment_gap_months=0)


def _form(**kw):
    d = dict(job_description=JD, required_experience_years="2", required_degree="MCA"); d.update(kw); return d


def _docx_bytes(lines):
    d = Document()
    for l in lines: d.add_paragraph(l)
    b = io.BytesIO(); d.save(b); return b.getvalue()


# ---------- NLP ----------
@pytest.mark.parametrize("text,expected", [
    ("Java Script, HTML", ["html", "javascript"]),
    ("JavaScript developer", ["javascript"]),
    ("JavaScript and Java", ["java", "javascript"]),
    ("C++ and C#", ["c#", "c++"]),
    ("Grade C in class", []),
    ("MySQL database", ["mysql", "sql"]),
    ("github.com/someone  me@x.com", []),
])
def test_skill_normalisation(text, expected):
    assert extract_skills(text) == expected


# ---------- Health + ML ----------
def test_home():
    assert client.get("/").json()["status"] == "active"


def test_predict_ok_and_shape():
    r = client.post("/model/predict", json=GOOD); assert r.status_code == 200
    d = r.json()
    assert d["prediction"] in ("Selected", "Not Selected") and 0 <= d["selection_probability"] <= 100
    assert d["explanation"]["method"].startswith("shap")
    assert (d["prediction"] == "Selected") == (d["selection_probability"] / 100 >= d["decision_threshold"])


def test_predict_category_is_canonicalised_not_silently_coerced():
    a = client.post("/model/predict", json=GOOD).json()["selection_probability"]
    b = client.post("/model/predict", json={**GOOD, "university_tier": "tier 1"}).json()["selection_probability"]
    assert a == b


@pytest.mark.parametrize("patch", [
    {"degree": "Wizard"}, {"location": "Mysuru"}, {"cgpa": 55}, {"python_skill": 0}, {"python_skill": 11},
    {"age": 5}, {"age": "abc"}, {"kaggle_activity_score": 50}, {"expected_salary_lpa": -3}, {"employment_gap_months": -1},
])
def test_predict_rejects_invalid(patch):
    assert client.post("/model/predict", json={**GOOD, **patch}).status_code == 422


def test_predict_rejects_missing_and_extra_fields():
    assert client.post("/model/predict", json={"age": 24}).status_code == 422
    assert client.post("/model/predict", json={**GOOD, "candidate_id": "X"}).status_code == 422


def test_predict_warns_when_outside_training_range():
    d = client.post("/model/predict", json={**GOOD, "age": 55}).json()
    assert any(w["feature"] == "age" for w in d["warnings"])


def test_model_meta():
    m = client.get("/model/meta").json()
    assert len(m["feature_order"]) == 22 and "Tier 1" in m["categories"]["university_tier"]
    assert abs(m["model_card"]["test_metrics"]["accuracy"] - 0.888) < 1e-3


# ---------- Resume workflow ----------
@pytest.mark.skipif(not SAMPLE_PDF.exists(), reason="sample resume missing")
def test_pdf_screening_end_to_end():
    r = client.post("/analysis/screen-upload", files={"file": ("r.pdf", SAMPLE_PDF.read_bytes(), "application/pdf")}, data=_form())
    assert r.status_code == 200; s = r.json()["screening"]; a = s["resume_analysis"]
    assert a["candidate"]["email"] and a["candidate"]["github"]
    assert a["experience"]["experience_months"] == 3
    assert [e["code"] for e in a["education_details"]][:2] == ["MCA", "BCA"]
    assert len(a["project_details"]) == 2 and len(a["certifications"]) == 2
    assert "github" not in a["skills"]
    assert s["education_match"]["education_match"] is True
    assert "fastapi" in s["skill_match"]["missing_skills"]
    exp = s["skill_match"]["match_score"] * .55 + s["experience_match"]["experience_match_score"] * .25 + s["education_match"]["education_match_score"] * .20
    assert abs(exp - s["resume_job_match_score"]) < 0.01


def test_docx_screening():
    b = _docx_bytes(["Asha Rao", "asha@example.com", "EXPERIENCE", "Acme Corp – Python Developer | Jan 2022 – Present",
                     "• Built APIs with FastAPI and MySQL", "EDUCATION", "B.Tech in Computer Science", "XYZ University | 2018 – 2022", "CGPA: 8.1 / 10",
                     "SKILLS", "Python, SQL, Docker, Java Script"])
    r = client.post("/analysis/screen-upload", files={"file": ("a.docx", b, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
                    data=_form(required_degree="B.Tech", required_experience_years="1"))
    assert r.status_code == 200; a = r.json()["screening"]["resume_analysis"]
    assert a["experience"]["experience_months"] >= 36            # 'Present' handled
    assert "javascript" in a["skills"] and "java" not in a["skills"]
    assert a["candidate"]["name"] == "Asha Rao"


def test_stream_emits_real_stages_in_order():
    with client.stream("POST", "/analysis/screen-upload-stream",
                       files={"file": ("a.docx", _docx_bytes(["Jane Doe", "SKILLS", "Python, SQL and Docker developer with experience"]), "x")}, data=_form()) as r:
        lines = [l for l in r.iter_lines() if l]
    import json
    stages = [json.loads(l).get("stage") for l in lines]
    assert stages[0] == "received" and stages[1] == "extracted" and stages[-1] == "done"
    assert {"skills", "experience", "education", "matching", "scoring"} <= set(stages)


# ---------- Invalid input ----------
def test_invalid_files():
    f = lambda name, content: client.post("/analysis/screen-upload", files={"file": (name, content, "x")}, data=_form())
    assert f("x.txt", b"hello").status_code == 400
    assert f("x.pdf", b"not a pdf at all").status_code == 422
    assert f("x.pdf", b"%PDF-1.4 garbage garbage garbage garbage garbage garbage").status_code == 422
    assert f("x.pdf", b"").status_code == 400
    assert f("x.pdf", b"%PDF" + b"0" * (5 * 1024 * 1024 + 10)).status_code == 413


@pytest.mark.parametrize("patch", [{"job_description": ""}, {"job_description": "short"}, {"required_degree": " "},
                                   {"required_experience_years": "-2"}, {"required_experience_years": "99"}, {"required_experience_years": "abc"}])
def test_invalid_form_values(patch):
    b = _docx_bytes(["Jane", "SKILLS", "Python developer with SQL experience and Docker knowledge"])
    r = client.post("/analysis/screen-upload", files={"file": ("a.docx", b, "x")}, data=_form(**patch))
    assert r.status_code == 422


def test_weird_dates_do_not_crash():
    r = client.post("/analysis/screen", json=dict(resume_text="EXPERIENCE\nAcme | Version 2024 – Release 2025\nbla bla bla bla bla bla bla bla bla bla bla",
                                                  job_description=JD, required_experience_years=2, required_degree="MCA"))
    assert r.status_code == 200


def test_path_traversal_filename_is_neutralised():
    b = _docx_bytes(["Jane", "SKILLS", "Python developer with SQL experience and Docker knowledge"])
    r = client.post("/resume/upload", files={"file": ("../../pwn.docx", b, "x")})
    assert r.status_code == 200 and r.json()["filename"] == "pwn.docx"
    assert not (ROOT / "pwn.docx").exists() and not (ROOT / "data" / "pwn.docx").exists()


def test_legacy_job_match_contract():
    r = client.post("/job/match", json={"job_description": "Python, SQL, FastAPI and Docker", "resume_skills": ["python", "sql"]})
    d = r.json(); assert d["match"]["matched_skills"] == ["python", "sql"] and set(d["match"]["missing_skills"]) == {"fastapi", "docker"}


@pytest.mark.parametrize("req,held,ok", [("MCA", "Master of Computer Applications (MCA)", True), ("BCA", "Master of Computer Applications (MCA)", True),
                                         ("MCA", "Bachelor of Computer Applications (BCA)", False), ("B.Tech", "B.E. in CSE", True),
                                         ("MCA or B.Tech", "B.Tech in IT", True), ("MBA", "B.Tech", False)])
def test_education_hierarchy(req, held, ok):
    from app.matching.education_matcher import calculate_education_match
    from app.services.degree_utils import classify_degree
    c = classify_degree(held); det = [{"code": c[0], "level": c[1]}]
    assert calculate_education_match([held], req, det)["education_match"] is ok
