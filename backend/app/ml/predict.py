"""Inference: identical pipeline to the training notebook.

DataFrame(columns=FEATURE_ORDER) -> saved preprocessor.transform -> saved XGBoost -> predict_proba.
The decision is made from the probability and the configured threshold (default 0.50, see
ml/reports/ML_DIAGNOSIS.md for why), and mapped through the saved label encoder.
"""
import pandas as pd

from app.ml.artifacts import (
    DECISION_THRESHOLD, FEATURE_LABELS, FEATURE_ORDER, POSITIVE_CLASS_INDEX, TRAINING_RANGES,
    label_encoder, model, preprocessor,
)
from app.ml.explain import explain


def _range_warnings(row: dict) -> list[dict]:
    out = []
    for feat, (lo, hi) in ((k, v) for k, v in TRAINING_RANGES.items()):
        if feat in row and not (lo <= row[feat] <= hi):
            out.append({
                "feature": feat, "label": FEATURE_LABELS.get(feat, feat), "value": row[feat],
                "training_min": lo, "training_max": hi,
                "message": f"{FEATURE_LABELS.get(feat, feat)} = {row[feat]} is outside the range the model "
                           f"was trained on ({lo}-{hi}); the estimate is an extrapolation.",
            })
    return out


def predict_dataframe(df: pd.DataFrame) -> pd.Series:
    """Positive-class probabilities for an already-validated frame (used by diagnostics too)."""
    ordered = df[FEATURE_ORDER]
    return pd.Series(model.predict_proba(preprocessor.transform(ordered))[:, POSITIVE_CLASS_INDEX], index=df.index)


def predict_candidate(candidate_data: dict, with_explanation: bool = True) -> dict:
    frame = pd.DataFrame([candidate_data])[FEATURE_ORDER]  # explicit column order
    probability = float(predict_dataframe(frame).iloc[0])
    positive = probability >= DECISION_THRESHOLD
    label = label_encoder.inverse_transform([1 if positive else 0])[0]
    result = {
        "prediction": "Selected" if label == "Yes" else "Not Selected",
        "selection_probability": round(probability * 100, 2),
        "decision_threshold": DECISION_THRESHOLD,
        "probability_note": "Selection probability is the model's estimated probability of the "
                            "'Selected' class — it is not the model's accuracy.",
        "warnings": _range_warnings(candidate_data),
    }
    if with_explanation:
        result["explanation"] = explain(frame)
        # backwards-compatible key
        result["insights"] = {
            "top_drivers": [
                {"feature": i["label"], "impact": "Positive" if i["shap"] > 0 else "Negative",
                 "score": i["value"], "detail": f"{i['label']} = {i['value']} (SHAP {i['shap']:+.2f})"}
                for i in result["explanation"]["toward_selected"] + result["explanation"]["away_from_selected"]
            ],
            "feature_importance_available": True,
        }
    return result
