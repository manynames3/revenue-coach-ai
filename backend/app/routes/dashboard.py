from datetime import timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.call import Call
from app.models.call_analysis import CallAnalysis
from app.models.rep import Rep
from app.models.user import User
from app.models.workspace import CoachingAssignment
from app.security import get_current_user, scoped_calls, organization_for, utcnow

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview")
def dashboard_overview(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    visible_ids = scoped_calls(db, user).with_entities(Call.id)
    analyses = db.query(CallAnalysis).join(Call).filter(Call.id.in_(visible_ids))
    real = analyses.filter(CallAnalysis.source_mode == "model")
    version = organization_for(db, user).framework_version
    current = real.filter(CallAnalysis.rubric_snapshot["version"].as_integer() == version)
    reps = db.query(Rep).filter(Rep.organization_id == user.organization_id)
    drills = db.query(CoachingAssignment).filter(CoachingAssignment.organization_id == user.organization_id)
    if user.role == "rep":
        reps = reps.filter(Rep.user_id == user.id)
        drills = drills.join(Rep).filter(Rep.user_id == user.id)
    recent = analyses.order_by(CallAnalysis.created_at.desc()).limit(10).all()
    recent_scores = [{"call_id": row.call_id, "rep_id": row.call.rep_id,
                      "lead_name": row.call.lead_name or "Untitled call",
                      "overall_score": row.overall_score, "scores": row.scores or {},
                      "source_mode": row.source_mode, "rubric_version": (row.rubric_snapshot or {}).get("version"),
                      "analyzed_at": row.created_at.isoformat()} for row in recent]
    avg = current.with_entities(func.avg(CallAnalysis.overall_score)).scalar()
    feedback = real.filter(CallAnalysis.feedback_at >= utcnow() - timedelta(days=30))
    feedback_count = feedback.count()
    helpful_count = feedback.filter(CallAnalysis.feedback_rating >= 4).count()
    review_time = feedback.with_entities(func.avg(CallAnalysis.review_seconds)).scalar()
    comparisons = drills.filter(CoachingAssignment.verified_score.is_not(None)).order_by(
        CoachingAssignment.reviewed_at.desc()).limit(20).all()
    return {"total_reps": reps.count(), "total_calls": scoped_calls(db, user).filter(Call.is_sample.is_(False)).count(),
            "analyzed_calls": real.count(), "average_score": round(float(avg), 1) if avg is not None else None,
            "top_rep_name": None, "top_rep_score": None, "recent_scores": recent_scores, "current_rubric_version": version,
            "coaching": {"assigned": drills.filter(CoachingAssignment.state == "assigned").count(),
                         "completed": drills.filter(CoachingAssignment.state == "completed").count(),
                         "reviewed": drills.filter(CoachingAssignment.state == "reviewed").count()},
            "skill_comparisons": [{"id": row.id, "skill": row.skill, "rep_name": db.get(Rep, row.rep_id).name,
                                  "baseline": row.baseline_score, "latest": row.verified_score,
                                  "delta": round(row.verified_score - row.baseline_score, 1),
                                  "is_sample": db.get(Call, row.call_id).is_sample} for row in comparisons],
            "feedback": {"reviewed_calls": feedback_count,
                         "helpful_percent": round(helpful_count / feedback_count * 100, 1) if feedback_count else None,
                         "average_review_seconds": round(float(review_time)) if review_time is not None else None,
                         "window_days": 30}}
