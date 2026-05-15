from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routes import calls, dashboard, reps


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Create default org if not exists
    from app.models.organization import Organization
    from sqlalchemy.orm import Session
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
