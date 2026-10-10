# ML Diagnosis & Change Report — Smart Resume Screening

## 1. Summary

The saved XGBoost model is **not** the problem. Run against the notebook's own split it reproduces the recorded metrics exactly, and its probabilities are well calibrated. The inaccurate predictions came from the **application layer feeding it inputs on the wrong scale, plus a schema that rejected valid data**. The model, preprocessor, label encoder, features, threshold and dataset are unchanged.

## 2. What was inspected

Backend routes/controllers/schemas, `app/ml/*`, the three saved artifacts, notebook `01_data_exploration.ipynb` (the only non-empty notebook: notebooks 02–05 are 0 bytes in the upload, so training code was read from notebook 01, cells 44–119), the training CSV (50,000 rows), the old React ML page and API layer.

## 3. Findings (before changes)

| # | Finding | Evidence |
|---|---|---|
| 1 | Skill fields (`python_skill`, `sql_skill`, …) are **1–10** in training, but the UI sent **0/1 toggles** — i.e. the bottom of the range. In training, `python_skill = 1` has a ~0 % selection rate. | CSV ranges; UI "Senior AI Engineer" preset scored 73 % with skills=1, **99.9 %** with the same profile on the 1–10 scale |
| 2 | `kaggle_activity_score` is a float **1.3–10** in training. The schema declared it `int`, so **89.4 % of real dataset rows were rejected with HTTP 422**; the UI worked around it by sending integers like 50/85 (out of distribution). | `(df.kaggle_activity_score % 1 != 0).mean()` = 0.894 |
| 3 | `expected_salary_lpa` was hard-coded to 10.0 in the UI — one of the model's strongest features pinned to a constant. | UI source |
| 4 | No range validation; unknown categories (`"Wizard"`, `"Mysuru"`, `"tier 1"`) silently zero-encoded by `OneHotEncoder(handle_unknown="ignore")`. | probe |
| 5 | The main screening flow never called the model; the ML page was a separate manual form. | code |
| 6 | `explain.py` was hand-written rules (e.g. `ml_skill >= 1`) presented as explainability — **not SHAP**, and meaningless on a 1–10 scale. | code |

**Verified healthy:** label mapping (`classes_ = ['No','Yes']`, inverse_transform correct); feature order (ColumnTransformer selects by name — shuffling columns changes nothing, max diff 0.0); preprocessor is the saved one; test metrics reproduce exactly.

## 4. Fixes applied

* `schemas/candidate_schema.py` — strict validation: categories canonicalised case-insensitively against the **saved preprocessor's own categories** and rejected if unknown; numeric ranges (skills 1–10, Kaggle 0–10 float, CGPA 0–10, …); `extra="forbid"`.
* `ml/artifacts.py` — single loader; explicit `FEATURE_ORDER` from `preprocessor.feature_names_in_`; asserts the label order.
* `ml/predict.py` — DataFrame in explicit column order → saved preprocessor → saved model; label via saved encoder; out-of-training-range warnings; response states the number is *selection probability, not accuracy*.
* `ml/explain.py` — **real SHAP** (`TreeExplainer`), one-hot columns summed back to original features; wording is "contributed toward / away from", never "caused".
* New `GET /model/meta` serves schema + model card; the new UI builds its form from it, so UI and model cannot drift apart.
* UI: ML runs from the candidate report, prefills only what a resume can supply (degree, CGPA, projects/certifications/internships counts, experience), flagged "from resume"; everything else is entered by the recruiter.

## 5. Notebook vs API (mandatory test)

`python -m ml.diagnostics.notebook_vs_api` — 15 test-set candidates (high/low-confidence Selected and Not Selected, borderline ≈0.50, and two cases the model gets wrong), each sent through `POST /model/predict` and compared with an independent re-run of the notebook pipeline.

**15 / 15 PASS** — identical prediction and probability to 2 dp. Full test set (10,000 rows) through the app's inference path vs the notebook path: **max probability difference 0.0**.

## 6. Metrics (held-out test set, unchanged model)

Accuracy 88.80 % · Precision 85.93 % · Recall 86.10 % · F1 86.01 % · ROC-AUC 95.70 % · confusion matrix `[[5436, 564], [556, 3444]]` — identical to the notebook. **No model was retrained or replaced, so there are no before/after metrics to report.**

## 7. Threshold (validation-based, test set not used to choose)

Model refit on 80 % of the training split with the notebook's hyper-parameters; threshold scanned on the held-out 20 % of train.

| t | val F1 | test precision | test recall | test F1 | FP | FN |
|---|---|---|---|---|---|---|
| 0.40 | 0.854 | 0.829 | 0.896 | 0.861 | 739 | 417 |
| 0.45 | 0.856 | 0.844 | 0.879 | 0.861 | 649 | 483 |
| **0.50** | 0.852 | 0.859 | 0.861 | 0.860 | 564 | 556 |
| 0.60 | 0.844 | 0.885 | 0.815 | 0.849 | 422 | 740 |
| 0.70 | 0.817 | 0.909 | 0.753 | 0.824 | 303 | 988 |

The validation-optimal threshold (0.45) beats 0.50 by only **0.0036 F1** — noise. **0.50 retained.** Recruiting trade-off: raising the threshold shortlists fewer people with fewer false positives but misses more qualified candidates; lowering it does the reverse.

## 8. Calibration

Approximate ECE **0.0055**, Brier 0.081. Candidates predicted ≥ 0.90 (21.5 % of the test set) were actually selected **96.5 %** of the time. Probabilities can be read at face value; no calibration layer was added because none is needed.

## 9. Data-quality and fairness findings (honest limitations)

* **The dataset looks synthetic.** A plain logistic regression on the 17 numeric columns reaches ROC-AUC **0.957** — equal to XGBoost. The target is largely a noisy linear score of the inputs.
* `expected_salary_lpa` is the single strongest correlate with "selected" (r = 0.62); a higher salary expectation increasing selection odds is not realistic hiring behaviour. Not removed (out of scope), but flagged in the Model card.
* **Gender and age are model inputs.** Mean P(selected) is balanced across genders (39.9 / 39.7 / 40.1 %), but flipping gender alone moves *individual* candidates by up to **10.8 pp**. The UI says to treat the model as one signal, never a decision. Consider removing these features in a future retrain.
* The model scores structured fields, not resume text; it is a separate score from Resume–Job Match.

## 10. NLP / backend fixes

| Issue | Fix |
|---|---|
| `"Java Script"` produced a false **Java** | longest-alias-first matching that blanks matched spans; custom boundaries so `javascript`≠`java`, `c++`≠`c` |
| URLs counted as skills (`github.com/x` → GitHub) | URLs/emails blanked before matching |
| Only the exact headings `INTERNSHIP / WORK EXPERIENCE`, `ACADEMIC PROJECTS` worked | layout-tolerant section parser |
| `Aug 2025 – Present` → 0 months; non-month words could raise `KeyError` → HTTP 500 | date parser with Present/Current, month/year, `MM/YYYY`, year-only; overlapping periods merged |
| Education was a raw substring check (MCA ⊉ BCA) | degree level/track model: MCA satisfies a BCA requirement; B.E.≡B.Tech; "MCA or B.Tech" supported |
| **Path traversal**: client filename used to write to disk (`../../pwn.pdf` was written outside the folder) | temp file, filename only for display, 5 MB cap, magic-byte check |
| 500s on corrupt files / bad inputs | explicit 400/413/422 with readable messages |
| CORS `*` with credentials | explicit origins via `CORS_ORIGINS` |

## 11. Test results (this session)

* `pytest backend/tests` — **42 passed**.
* Notebook vs API — **15/15 PASS**, full test set diff 0.0.
* Browser E2E (Chromium via Playwright), clean restart of both servers — **33/33** (PDF flow, ML form validation, persistence, 6 workspace pages, no horizontal overflow at 820 px and 390 px, mobile navigation) and **8/8** (DOCX flow, backend-offline error + retry, corrupt PDF); **0 console errors, 0 page errors, 0 failed requests** in the main flow.

## 12. Known limitations / not done

* Not verified on real iOS/Android devices or browsers other than Chromium; mobile/tablet were tested by viewport emulation.
* No ESLint config exists in the project, so no lint run is claimed.
* Screening history is browser-local (`localStorage`); the backend has no database.
* Skill detection is dictionary-based (≈90 skills); skills outside it are not detected. "Evidence strength" is based on where/how often a skill appears, not a proficiency test.
* The original training notebooks 02–05 are empty in the upload; the training procedure was reconstructed from notebook 01 and verified by exact metric reproduction.
* Scanned/image-only PDFs are rejected (no OCR).
* The original `.venv` in the upload was a Windows environment; recreate it with the commands in the README.
