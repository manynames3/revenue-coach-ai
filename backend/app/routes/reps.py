from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rep import Rep
from app.schemas.rep import RepCreate, RepOut

router = APIRouter(prefix="/reps", tags=["reps"])


@router.post("", response_model=RepOut)
def create_rep(body: RepCreate, db: Session = Depends(get_db)):
    rep = Rep(**body.model_dump())
    db.add(rep)
    db.commit()
    db.refresh(rep)
    return rep


@router.get("", response_model=list[RepOut])
def list_reps(db: Session = Depends(get_db)):
    return db.query(Rep).order_by(Rep.created_at.desc()).all()
