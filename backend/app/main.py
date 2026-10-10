import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.model_routes import router as model_router
from app.routes.resume_routes import router as resume_router
from app.routes.job_routes import router as job_router
from app.routes.analysis_routes import router as analysis_router

app = FastAPI(title="Smart Resume Screening API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173").split(",")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    model_router,
    prefix="/model"
)
app.include_router(
    resume_router,
    prefix="/resume"
)

app.include_router(
    job_router,
    prefix="/job"
)
app.include_router(
    analysis_router,
    prefix="/analysis"
)


@app.get("/")
def home():
    return {"message": "Smart Resume Screening API is running", "status": "active"}
