import json

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.call import Call
from app.models.call_analysis import CallAnalysis
from app.models.rep import Rep
from app.schemas.dashboard import DashboardOverview

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverview)
def dashboard_overview(db: Session = Depends(get_db)):
    total_reps = db.query(func.count(Rep.id)).scalar() or 0
    total_calls = db.query(func.count(Call.id)).scalar() or 0
    analyzed_calls = db.query(func.count(CallAnalysis.id)).scalar() or 0

    avg_score = (
        db.query(func.avg(CallAnalysis.overall_score)).scalar() or 0
    )

    top_rep = (
        db.query(Rep.name, CallAnalysis.overall_score)
        .join(Call, Call.rep_id == Rep.id)
        .join(CallAnalysis, CallAnalysis.call_id == Call.id)
        .order_by(CallAnalysis.overall_score.desc())
        .first()
    )

    recent_analyses = (
        db.query(CallAnalysis, Call)
        .join(Call, Call.id == CallAnalysis.call_id)
        .order_by(CallAnalysis.created_at.desc())
        .limit(10)
        .all()
    )

    recent_scores = []
    for analysis, call in recent_analyses:
        recent_scores.append({
            "call_id": call.id,
            "lead_name": call.lead_name or "Unknown",
            "rep_id": call.rep_id,
            "overall_score": analysis.overall_score,
            "scores": analysis.scores or {},
            "analyzed_at": analysis.created_at.isoformat() if analysis.created_at else None,
        })

    return DashboardOverview(
        total_reps=total_reps,
        total_calls=total_calls,
        analyzed_calls=analyzed_calls,
        average_score=round(float(avg_score), 1) if avg_score else 0,
        top_rep_name=top_rep[0] if top_rep else None,
        top_rep_score=round(float(top_rep[1]), 1) if top_rep and top_rep[1] else None,
        recent_scores=recent_scores,
    )
