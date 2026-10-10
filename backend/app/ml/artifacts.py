"""Single source of truth for the saved ML artifacts.

Loads the *exact* preprocessor / model / label encoder produced by the training
notebook and exposes the schema (feature order, categories, ranges) derived from them.
Nothing here re-fits or re-creates an encoder.
"""
from __future__ import annotations

import json
import warnings
from pathlib import Path

import joblib

BACKEND_DIR = Path(__file__).resolve().parents[2]
MODELS_DIR = BACKEND_DIR / "ml" / "models"
MODEL_CARD_PATH = MODELS_DIR / "model_card.json"

# sklearn emits InconsistentVersionWarning when the pickle was written by another version.
# Transform/predict are unaffected (verified in ml/diagnostics/notebook_vs_api.py).
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    model = joblib.load(MODELS_DIR / "final" / "resume_selection_model.pkl")
    preprocessor = joblib.load(MODELS_DIR / "encoders" / "resume_preprocessor.pkl")
    label_encoder = joblib.load(MODELS_DIR / "encoders" / "label_encoder.pkl")

# Explicit feature order = the order the preprocessor was fitted with.
FEATURE_ORDER: list[str] = list(preprocessor.feature_names_in_)

CATEGORICAL_FEATURES: list[str] = list(preprocessor.transformers_[0][2])
CATEGORIES: dict[str, list[str]] = {
    col: [str(c) for c in cats]
    for col, cats in zip(CATEGORICAL_FEATURES, preprocessor.named_transformers_["cat"].categories_)
}
NUMERIC_FEATURES: list[str] = [f for f in FEATURE_ORDER if f not in CATEGORICAL_FEATURES]

# Label mapping guard: the API must never silently reverse Yes/No.
_classes = [str(c) for c in label_encoder.classes_]
assert _classes == ["No", "Yes"], f"Unexpected label order: {_classes}"
POSITIVE_CLASS_INDEX = _classes.index("Yes")  # == 1

# Hard validity bounds (what is a plausible human value) -> reject outside.
HARD_BOUNDS: dict[str, tuple[float, float]] = {
    "age": (18, 65), "cgpa": (0, 10), "years_experience": (0, 50),
    "internships_count": (0, 50), "projects_count": (0, 100), "certifications_count": (0, 100),
    "python_skill": (1, 10), "sql_skill": (1, 10), "machine_learning_skill": (1, 10),
    "deep_learning_skill": (1, 10), "communication_skill": (1, 10), "leadership_skill": (1, 10),
    "github_projects": (0, 200), "kaggle_activity_score": (0, 10), "hackathons_participated": (0, 100),
    "expected_salary_lpa": (0, 200), "employment_gap_months": (0, 240),
}
INTEGER_FEATURES = {
    "age", "years_experience", "internships_count", "projects_count", "certifications_count",
    "python_skill", "sql_skill", "machine_learning_skill", "deep_learning_skill",
    "communication_skill", "leadership_skill", "github_projects", "hackathons_participated",
    "employment_gap_months",
}

FEATURE_LABELS = {
    "age": "Age", "gender": "Gender", "degree": "Degree", "specialization": "Specialization",
    "university_tier": "University tier", "cgpa": "CGPA", "years_experience": "Years of experience",
    "internships_count": "Internships", "projects_count": "Projects", "certifications_count": "Certifications",
    "python_skill": "Python skill", "sql_skill": "SQL skill", "machine_learning_skill": "Machine learning skill",
    "deep_learning_skill": "Deep learning skill", "communication_skill": "Communication",
    "leadership_skill": "Leadership", "github_projects": "GitHub projects",
    "kaggle_activity_score": "Kaggle activity", "hackathons_participated": "Hackathons",
    "expected_salary_lpa": "Expected salary (LPA)", "location": "Location",
    "employment_gap_months": "Employment gap (months)",
}


def load_model_card() -> dict:
    if MODEL_CARD_PATH.exists():
        return json.loads(MODEL_CARD_PATH.read_text(encoding="utf-8"))
    return {}


MODEL_CARD = load_model_card()
TRAINING_RANGES: dict[str, list[float]] = MODEL_CARD.get("training_ranges", {})
DECISION_THRESHOLD: float = float(MODEL_CARD.get("decision_threshold", 0.5))
