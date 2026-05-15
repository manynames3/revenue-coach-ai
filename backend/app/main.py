from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine
from app.routes import calls, dashboard, reps


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.models import call, call_analysis, organization, rep, user  # noqa: F401
    from app.models.organization import Organization

    Base.metadata.create_all(bind=engine)
    # Create default org if not exists
    with Session(engine) as session:
        default_org = session.query(Organization).filter(Organization.id == "default").first()
        if not default_org:
            session.add(Organization(id="default", name="Default Org"))
            session.commit()
    yield


app = FastAPI(title="RevenueCoach AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reps.router)
app.include_router(calls.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def readiness():
    checks = {
        "database": False,
        "ai_configured": bool(settings.zai_api_key) or settings.mock_ai,
        "aws_bucket_configured": bool(settings.aws_s3_bucket),
    }

    try:
        with Session(engine) as session:
            session.execute(text("select 1"))
        checks["database"] = True
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "checks": checks, "error": str(exc)},
        )

    return {"status": "ready", "checks": checks}
