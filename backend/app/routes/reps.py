from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rep import Rep
from app.models.user import User
from app.security import audit, get_current_user, manager
from app.schemas.rep import RepCreate, RepOut

router = APIRouter(prefix="/reps", tags=["reps"])


@router.post("", response_model=RepOut, status_code=201)
def create_rep(body: RepCreate, db: Session = Depends(get_db), user: User = Depends(manager)):
    if body.organization_id and body.organization_id != user.organization_id:
        raise HTTPException(403, "The workspace is determined by your account.")
    if not body.name.strip() or len(body.name) > 100:
        raise HTTPException(422, "Enter a rep name under 100 characters.")
    rep = Rep(**body.model_dump(exclude={"organization_id"}), organization_id=user.organization_id)
    db.add(rep)
    db.flush()
    audit(db, user, "rep_created", {"rep_id": rep.id})
    db.commit()
    db.refresh(rep)
    return rep


@router.get("", response_model=list[RepOut])
def list_reps(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Rep).filter(Rep.organization_id == user.organization_id)
    if user.role == "rep":
        query = query.filter(Rep.user_id == user.id)
    return query.order_by(Rep.created_at.desc()).all()
