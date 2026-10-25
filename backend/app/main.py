from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine
from app.models.user import User
from app.models.organization import Organization
from app.models.workspace import AnalysisJob
from app.routes import account, auth, calls, coaching, dashboard, onboarding, pilots, reps


@asynccontextmanager
async def lifespan(app):
    from app import models  # noqa: F401
    if settings.auto_create_schema:
        Base.metadata.create_all(bind=engine)
    if settings.session_cookie_samesite not in {"lax", "strict", "none"}:
        raise RuntimeError("Invalid session cookie policy")
    if settings.session_cookie_samesite == "none" and not settings.session_cookie_secure:
        raise RuntimeError("Cross-site sessions require Secure cookies")
    if settings.frontend_url.startswith("https://") and not settings.session_cookie_secure:
        raise RuntimeError("HTTPS deployments require Secure session cookies")
    if "*" in settings.cors_origins:
        raise RuntimeError("Configure explicit allowed origins")
    yield


app = FastAPI(title="RevenueCoach AI", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                   allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
                   allow_headers=["Content-Type", "X-CSRF-Token"])


@app.middleware("http")
async def private_responses(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


for route in (auth, reps, calls, dashboard, account, coaching, onboarding, pilots):
    app.include_router(route.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def readiness():
    try:
        with Session(engine) as session:
            session.query(User.id, User.active).limit(1).all()
            session.query(AnalysisJob.id).limit(1).all()
            session.query(Organization.id, Organization.processing_enabled).limit(1).all()
    except Exception:
        return JSONResponse(status_code=503, content={"status": "not_ready", "checks": {"database": False}})
    return {"status": "ready", "checks": {"database": True,
            "ai_configured": bool(settings.zai_api_key) and not settings.mock_ai,
            "aws_bucket_configured": bool(settings.aws_s3_bucket)},
            "sample_available": True}
