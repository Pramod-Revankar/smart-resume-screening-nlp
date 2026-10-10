# Smart Resume Screening

AI recruitment intelligence: upload a resume, describe the role, get an evidence-based **Resume–Job Match** report — plus an optional, clearly separate **ML Selection Probability** from an XGBoost model with SHAP explanations.

```
frontend/   React 19 + Vite + Tailwind 4 + Framer Motion + Recharts
backend/    FastAPI · NLP extraction · matching · XGBoost inference (app/ml) · training artifacts (ml/)
data/       sample resumes / job descriptions
docs/       ML_DIAGNOSIS.md  (root-cause analysis, metrics, limitations)
```

## Run it

**Backend** (Python 3.10+)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r app/requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (Node 20+)
```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_BASE_URL=http://127.0.0.1:8000
npm run dev                   # http://localhost:5173
```
Allowed browser origins are set by `CORS_ORIGINS` (default: localhost/127.0.0.1 on 5173 and 4173).

## Tests

```bash
cd backend
python -m pytest tests -q                       # 42 API + NLP + validation tests
python -m ml.diagnostics.notebook_vs_api        # notebook pipeline vs POST /model/predict
python -m ml.diagnostics.build_model_card       # regenerate ml/models/model_card.json

cd ../frontend    # with backend + `npm run dev` running; needs `npm i -D playwright`
node tests/e2e/screening-flow.e2e.cjs && node tests/e2e/resilience.e2e.cjs
```

## Key API endpoints
| Endpoint | Purpose |
|---|---|
| `POST /analysis/screen-upload` | resume file + job → full screening (unchanged contract, additive fields) |
| `POST /analysis/screen-upload-stream` | same work as NDJSON events as each real stage finishes |
| `POST /model/predict` | validated 22-field ML prediction + SHAP factors |
| `GET  /model/meta` | feature schema, categories, bounds, model card |
| `POST /resume/upload`, `/job/match`, `/analysis/screen` | preserved |

## Two scores — never merged
* **Resume–Job Match** = 55 % skills + 25 % experience + 20 % education (from resume text + job description).
* **ML Selection Probability** = XGBoost estimate for the *Selected* class from 22 structured profile fields. It is **not** model accuracy. Fields a resume can't supply (skill ratings 1–10, salary, age, …) are entered by the recruiter, never guessed.

Screenings, statuses and notes are stored in the browser (`localStorage`); the API is stateless and discards uploaded files.
