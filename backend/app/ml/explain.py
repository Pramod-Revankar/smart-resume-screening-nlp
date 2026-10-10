"""Candidate-level SHAP explanations.

SHAP values come from shap.TreeExplainer on the saved XGBoost model. One-hot columns are
summed back to their original feature so the result is readable. A contribution is a
*factor that pushed the model's log-odds toward or away from "Selected"* for this input —
it describes the model's behaviour, not a cause of the outcome in the real world.
"""
from __future__ import annotations

import numpy as np

from app.ml.artifacts import CATEGORICAL_FEATURES, FEATURE_LABELS, FEATURE_ORDER, model, preprocessor

_explainer = None


def _get_explainer():
    global _explainer
    if _explainer is None:
        import shap  # imported lazily: heavy

        _explainer = shap.TreeExplainer(model)
    return _explainer


def _owner(encoded_name: str) -> str:
    name = encoded_name.split("__", 1)[-1]
    for col in CATEGORICAL_FEATURES:
        if encoded_name.startswith(f"cat__{col}_"):
            return col
    return name


def explain(candidate_df, top_k: int = 6) -> dict:
    try:
        encoded = preprocessor.transform(candidate_df)
        sv = np.asarray(_get_explainer().shap_values(encoded))[0]
        base = float(np.ravel(_get_explainer().expected_value)[0])
        owners = [_owner(n) for n in preprocessor.get_feature_names_out()]
        per_feature: dict[str, float] = {f: 0.0 for f in FEATURE_ORDER}
        for o, v in zip(owners, sv):
            per_feature[o] = per_feature.get(o, 0.0) + float(v)
        row = candidate_df.iloc[0]
        items = [
            {
                "feature": f,
                "label": FEATURE_LABELS.get(f, f),
                "value": row[f].item() if hasattr(row[f], "item") else row[f],
                "shap": round(v, 4),
                "direction": "toward_selected" if v > 0 else "away_from_selected",
            }
            for f, v in per_feature.items()
        ]
        items.sort(key=lambda d: abs(d["shap"]), reverse=True)
        top = [i for i in items if abs(i["shap"]) >= 1e-3][:top_k]
        return {
            "method": "shap.TreeExplainer (log-odds contribution per feature)",
            "base_value_logodds": round(base, 4),
            "toward_selected": [i for i in top if i["shap"] > 0],
            "away_from_selected": [i for i in top if i["shap"] < 0],
            "note": "Factors that contributed toward or away from the model's prediction. "
                    "They describe model behaviour, not causes of selection.",
        }
    except Exception as exc:  # explanation must never break prediction
        return {"method": "unavailable", "toward_selected": [], "away_from_selected": [], "error": str(exc)}
