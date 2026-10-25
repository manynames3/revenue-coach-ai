from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.call import Call
from app.models.rep import Rep
from app.models.user import User
from app.sample_call import SAMPLE_SEGMENTS, SAMPLE_TRANSCRIPT
from app.security import audit, get_current_user, organization_for, scoped_calls, utcnow
from app.services.analysis_jobs import persist_analysis, snapshot_for
from app.services.sales_analyzer import SalesAnalyzer

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/sample")
def create_sample(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = scoped_calls(db, user).filter(Call.is_sample.is_(True)).first()
    if existing:
        return {"call_id": existing.id}
    rep = db.query(Rep).filter(Rep.organization_id == user.organization_id, Rep.user_id == user.id).first()
    if not rep:
        rep = Rep(organization_id=user.organization_id, name=user.name, email=user.email, user_id=user.id)
        db.add(rep)
        db.flush()
    call = Call(rep_id=rep.id, organization_id=user.organization_id, lead_name="Sample: onboarding discovery",
                call_type="Illustrative sample", transcript=SAMPLE_TRANSCRIPT, transcript_segments=SAMPLE_SEGMENTS,
                is_sample=True, consent_confirmed=True, consent_notes="Synthetic example, no customer data.",
                status="transcribed", transcribed_at=utcnow())
    db.add(call)
    db.flush()
    snapshot = snapshot_for(organization_for(db, user))
    result = SalesAnalyzer().analyze(SAMPLE_TRANSCRIPT, snapshot, SAMPLE_SEGMENTS, is_sample=True)
    persist_analysis(db, call, result, snapshot, "sample")
    audit(db, user, "sample_opened", {"call_id": call.id})
    db.commit()
    return {"call_id": call.id}
