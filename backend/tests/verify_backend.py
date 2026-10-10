import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_home():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "active"
    print("[OK] GET / passed")


def test_predict():
    payload = {
        "age": 24,
        "gender": "Male",
        "degree": "B.Tech",
        "specialization": "Computer Science",
        "university_tier": "Tier 1",
        "cgpa": 8.5,
        "years_experience": 2,
        "internships_count": 2,
        "projects_count": 4,
        "certifications_count": 2,
        "python_skill": 1,
        "sql_skill": 1,
        "machine_learning_skill": 1,
        "deep_learning_skill": 0,
        "communication_skill": 4,
        "leadership_skill": 3,
        "github_projects": 5,
        "kaggle_activity_score": 50,
        "hackathons_participated": 2,
        "expected_salary_lpa": 12.0,
        "location": "Bangalore",
        "employment_gap_months": 0
    }
    res = client.post("/model/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "prediction" in data
    assert "selection_probability" in data
    print(f"[OK] POST /model/predict passed -> Prediction: {data['prediction']}, Probability: {data['selection_probability']}%")


def test_job_match():
    payload = {
        "job_description": "Looking for a Python Developer skilled in SQL, Machine Learning, FastAPI, and Docker.",
        "resume_skills": ["python", "sql", "machine learning"]
    }
    res = client.post("/job/match", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "match" in data
    print(f"[OK] POST /job/match passed -> Matched score: {data['match']['match_score']}%")


def test_screen_json():
    payload = {
        "resume_text": "Experienced Python Developer with 3 years of experience in SQL, Machine Learning, MCA degree.",
        "job_description": "Python SQL Machine Learning Developer with 2 years experience and MCA.",
        "required_experience_years": 2,
        "required_degree": "MCA"
    }
    res = client.post("/analysis/screen", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "screening" in data
    print(f"[OK] POST /analysis/screen passed -> Recommendation: {data['screening']['recommendation']}")


def test_screen_upload():
    # Use real PDF sample if available
    sample_pdf = backend_dir.parent / "data" / "resumes" / "Pramodresumeplacement .pdf"
    if not sample_pdf.exists():
        print("Sample PDF not found, skipping file upload test")
        return

    with open(sample_pdf, "rb") as f:
        files = {"file": (sample_pdf.name, f, "application/pdf")}
        data = {
            "job_description": "We are seeking a Python Developer with SQL, Machine Learning, and web development skills.",
            "required_experience_years": 1,
            "required_degree": "MCA"
        }
        res = client.post("/analysis/screen-upload", files=files, data=data)
        assert res.status_code == 200
        result = res.json()
        assert "screening" in result
        print(f"[OK] POST /analysis/screen-upload passed -> Score: {result['screening']['resume_job_match_score']}%, Rec: {result['screening']['recommendation']}")



if __name__ == "__main__":
    print("--- Running Backend API Verification ---")
    test_home()
    test_predict()
    test_job_match()
    test_screen_json()
    test_screen_upload()
    print("--- ALL BACKEND TESTS PASSED ---")
