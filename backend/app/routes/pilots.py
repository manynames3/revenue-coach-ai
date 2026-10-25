from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.workspace import PilotRequest
from app.security import check_origin, consume_limit, validate_email, request_peer

router = APIRouter(prefix="/pilots", tags=["pilots"])


class PilotCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(max_length=254)
    company: str = Field(min_length=1, max_length=100)
    team_size: int = Field(ge=1, le=500)
    goal: str = Field(min_length=10, max_length=2000)


@router.get("/offer")
def offer():
    return {"days": 30, "price_usd": settings.pilot_price_usd, "billing": "invoice",
            "support_email": settings.support_email,
            "includes": ["Team workspace and rubric setup", "Call evidence and coaching scorecards",
                         "Assigned practice and next-call verification", "End-of-pilot review"]}


@router.post("", status_code=201)
def request_pilot(body: PilotCreate, request: Request, db: Session = Depends(get_db)):
    check_origin(request)
    peer = request_peer(request)
    consume_limit(db, f"pilot:{peer}", 5, 3600)
    row = PilotRequest(**{**body.model_dump(), "email": validate_email(body.email)})
    db.add(row)
    db.commit()
    return {"id": row.id, "state": row.state,
            "message": "Your pilot request has been recorded. Scope and price will be confirmed before an invoice is issued."}
