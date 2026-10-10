from fastapi import APIRouter

from app.ml.artifacts import CATEGORIES, FEATURE_LABELS, FEATURE_ORDER, HARD_BOUNDS, INTEGER_FEATURES, MODEL_CARD
from app.ml.predict import predict_candidate
from app.schemas.candidate_schema import CandidateInput

router = APIRouter()


@router.post("/predict")
def predict(data: CandidateInput):
    return predict_candidate(data.model_dump())


@router.get("/meta")
def meta():
    """Everything the UI needs to build a valid form + show the model card."""
    return {
        "feature_order": FEATURE_ORDER,
        "labels": FEATURE_LABELS,
        "categories": CATEGORIES,
        "bounds": {k: {"min": v[0], "max": v[1], "integer": k in INTEGER_FEATURES} for k, v in HARD_BOUNDS.items()},
        "model_card": MODEL_CARD,
    }
