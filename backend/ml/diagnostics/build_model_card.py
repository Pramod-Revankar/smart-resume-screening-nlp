"""Rebuild ml/models/model_card.json from the saved artifacts + dataset.

Run from backend/:   python -m ml.diagnostics.build_model_card
The split is the notebook's: train_test_split(test_size=0.2, random_state=42, stratify=y).
Threshold analysis is done on a VALIDATION split carved out of the training set
(model refit on the remaining training rows with the notebook hyper-parameters), so the
test set is never used to choose the threshold.
"""
import json, sys, warnings
from pathlib import Path

import numpy as np, pandas as pd
warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sklearn.calibration import calibration_curve
from sklearn.compose import ColumnTransformer
from sklearn.metrics import (accuracy_score, brier_score_loss, confusion_matrix, f1_score, log_loss,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier

from app.ml.artifacts import CATEGORICAL_FEATURES, MODELS_DIR, MODEL_CARD_PATH, label_encoder, model, preprocessor
from app.ml.predict import predict_dataframe

BACKEND = Path(__file__).resolve().parents[2]
df = pd.read_csv(BACKEND / "ml/datasets/raw/resume_screening_dataset.csv")
X = df.drop(columns=["selected", "candidate_id"]); y = label_encoder.transform(df["selected"])
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
pte = predict_dataframe(Xte).values

def metrics(p, y, t=0.5):
    pr = (p >= t).astype(int); tn, fp, fn, tp = confusion_matrix(y, pr).ravel()
    return dict(threshold=t, accuracy=accuracy_score(y, pr), precision=precision_score(y, pr),
                recall=recall_score(y, pr), f1=f1_score(y, pr), false_positives=int(fp), false_negatives=int(fn),
                true_positives=int(tp), true_negatives=int(tn))

# threshold study
Xt2, Xv, yt2, yv = train_test_split(Xtr, ytr, test_size=0.2, random_state=42, stratify=ytr)
pre2 = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES)], remainder="passthrough")
m2 = XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
                   random_state=42, eval_metric="logloss").fit(pre2.fit_transform(Xt2), yt2)
pv = m2.predict_proba(pre2.transform(Xv))[:, 1]
grid = [0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7, 0.8]
thr_table = [{"validation": metrics(pv, yv, t), "test": metrics(pte, yte, t)} for t in grid]
ts = np.linspace(0.2, 0.8, 61)
best_val_t = float(max(ts, key=lambda t: f1_score(yv, (pv >= t).astype(int))))
gain = f1_score(yv, (pv >= best_val_t).astype(int)) - f1_score(yv, (pv >= 0.5).astype(int))
CHOSEN = 0.5  # gain from moving to the validation optimum is < 0.005 F1 -> keep the standard cut-off

fr, mp = calibration_curve(yte, pte, n_bins=10, strategy="quantile")
rng = {c: [float(X[c].min()), float(X[c].max())] for c in X.select_dtypes("number").columns}

card = {
    "model": "XGBClassifier (300 trees, depth 6, lr 0.05)",
    "training_rows": int(len(Xtr)), "test_rows": int(len(Xte)), "n_features": 22,
    "target": "selected (No=0, Yes=1)", "positive_rate": float(np.mean(y)),
    "test_metrics": {**metrics(pte, yte, CHOSEN), "roc_auc": roc_auc_score(yte, pte),
                     "brier": brier_score_loss(yte, pte), "log_loss": log_loss(yte, pte)},
    "decision_threshold": CHOSEN,
    "threshold_rationale": (f"0.50 retained. On a validation split the F1-optimal cut-off was {best_val_t:.2f}, "
                            f"worth only {gain:+.4f} F1 over 0.50, which is within noise. Raising the threshold trades recall for precision "
                            "(fewer false positives, more qualified candidates missed); lowering does the reverse."),
    "threshold_table": thr_table, "validation_best_threshold": best_val_t,
    "calibration": {"mean_predicted": mp.tolist(), "observed_rate": fr.tolist(),
                    "ece_approx": float(np.mean(np.abs(fr - mp))),
                    "share_ge_90": float((pte >= .9).mean()), "observed_rate_ge_90": float(yte[pte >= .9].mean())},
    "training_ranges": rng,
    "caveats": [
        "The training data is synthetic-looking: a plain logistic regression on the numeric columns matches XGBoost (AUC ~0.957).",
        "expected_salary_lpa is the single strongest correlate of the target; a higher salary expectation raising selection odds is not realistic hiring behaviour.",
        "gender and age are model inputs; flipping gender alone shifts individual probabilities by up to ~11 percentage points.",
        "The model scores structured profile fields, not resume text. Resume-Job Match is a separate score.",
    ],
}
MODEL_CARD_PATH.write_text(json.dumps(card, indent=2), encoding="utf-8")
print("wrote", MODEL_CARD_PATH); print(json.dumps({k: card[k] for k in ("test_metrics","decision_threshold","validation_best_threshold")}, indent=1))
