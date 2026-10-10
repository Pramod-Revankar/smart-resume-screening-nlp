"""Mandatory test: notebook pipeline vs POST /model/predict on identical candidates.

Run from backend/:   python -m ml.diagnostics.notebook_vs_api
"Notebook pipeline" = exactly what notebook cell 116/117 does (raw DataFrame -> saved preprocessor ->
saved model -> predict/predict_proba, label via saved encoder), executed independently of app.ml.predict.
"""
import json, sys, warnings
from pathlib import Path
import joblib, numpy as np, pandas as pd
warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from fastapi.testclient import TestClient
from sklearn.model_selection import train_test_split

from app.main import app

B = Path(__file__).resolve().parents[2]; M = B / "ml/models"
nb_model = joblib.load(M / "final/resume_selection_model.pkl")
nb_pre = joblib.load(M / "encoders/resume_preprocessor.pkl")
nb_le = joblib.load(M / "encoders/label_encoder.pkl")
df = pd.read_csv(B / "ml/datasets/raw/resume_screening_dataset.csv")
X = df.drop(columns=["selected", "candidate_id"]); y = nb_le.transform(df["selected"])
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
enc = nb_pre.transform(Xte)
p = nb_model.predict_proba(enc)[:, 1]
test = df.loc[Xte.index].assign(p=p)
rng = np.random.RandomState(0)
def pick(mask, n, name):
    return [(i, name) for i in rng.choice(test[mask].index, n, replace=False)]
picks = (pick((test.selected == "Yes") & (test.p > .95), 3, "high-confidence Selected")
       + pick((test.selected == "Yes") & (test.p.between(.5, .6)), 2, "low-confidence Selected")
       + pick((test.selected == "No") & (test.p < .02), 3, "high-confidence Not Selected")
       + pick((test.selected == "No") & (test.p.between(.4, .5)), 2, "low-confidence Not Selected")
       + pick(test.p.between(.495, .505), 3, "borderline")
       + pick((test.selected == "Yes") & (test.p < .1), 1, "model-wrong (actual Yes)")
       + pick((test.selected == "No") & (test.p > .9), 1, "model-wrong (actual No)"))
client = TestClient(app); rows = []; ok_all = True
for idx, kind in picks:
    row = df.loc[idx]; payload = {c: (row[c].item() if hasattr(row[c], "item") else row[c]) for c in X.columns}
    nb_p = float(nb_model.predict_proba(nb_pre.transform(pd.DataFrame([payload])))[0, 1])
    nb_pred = "Selected" if nb_le.inverse_transform([int(nb_model.predict(nb_pre.transform(pd.DataFrame([payload])))[0])])[0] == "Yes" else "Not Selected"
    r = client.post("/model/predict", json=payload)
    if r.status_code != 200:
        rows.append(dict(id=row.candidate_id, kind=kind, status="FAIL", detail=r.text[:200])); ok_all = False; continue
    a = r.json(); dp = abs(a["selection_probability"] - round(nb_p * 100, 2))
    ok = a["prediction"] == nb_pred and dp < 0.011
    ok_all &= ok
    rows.append(dict(id=row.candidate_id, kind=kind, actual=row.selected, nb_pred=nb_pred, nb_prob=round(nb_p * 100, 2),
                     api_pred=a["prediction"], api_prob=a["selection_probability"], status="PASS" if ok else "FAIL"))
print(f"{'Candidate':<12}{'Case':<30}{'Actual':<7}{'Notebook':<22}{'API':<22}Status")
for r in rows:
    if r["status"] == "FAIL" and "detail" in r: print(r); continue
    print(f"{r['id']:<12}{r['kind']:<30}{r['actual']:<7}{r['nb_pred']+' '+str(r['nb_prob'])+'%':<22}{r['api_pred']+' '+str(r['api_prob'])+'%':<22}{r['status']}")
# full-test-set equivalence through the library path (not HTTP)
from app.ml.predict import predict_dataframe
full = predict_dataframe(Xte).values
print("\nFull test set (", len(Xte), "rows) max |notebook - app.ml.predict| prob diff:", float(np.max(np.abs(full - p))))
print("OVERALL:", "PASS" if ok_all and np.max(np.abs(full - p)) < 1e-9 else "FAIL")
(B / "ml/reports/notebook_vs_api.json").write_text(json.dumps(rows, indent=1))
sys.exit(0 if ok_all else 1)
