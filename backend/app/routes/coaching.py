from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.call import Call
from app.models.rep import Rep
from app.models.user import User
from app.models.workspace import CoachingAssignment
from app.security import accessible_call, accessible_rep, aware, audit, get_current_user, manager, organization_for, utcnow
from app.services.privacy import redact

router = APIRouter(prefix="/coaching", tags=["coaching"])


class AssignmentCreate(BaseModel):
    call_id: str
    skill: str
    instructions: str = Field(min_length=20, max_length=3000)
    due_at: datetime = Field(default_factory=lambda: utcnow() + timedelta(days=7))


class PracticeSubmission(BaseModel):
    response: str = Field(min_length=20, max_length=5000)


class ManagerReview(BaseModel):
    feedback: str = Field(min_length=10, max_length=3000)
    verification_call_id: str | None = None


def assignment_out(row, db):
    rep = db.get(Rep, row.rep_id)
    return {**{key: getattr(row, key) for key in (
        "id", "rep_id", "call_id", "skill", "instructions", "due_at", "state", "practice_response",
        "feedback", "verification_call_id", "baseline_score", "verified_score", "created_at",
        "completed_at", "reviewed_at")}, "rep_name": rep.name if rep else "Former rep"}


def scoped_assignments(db, user):
    query = db.query(CoachingAssignment).filter(CoachingAssignment.organization_id == user.organization_id)
    if user.role == "rep":
        query = query.join(Rep).filter(Rep.user_id == user.id)
    return query


def get_assignment(db, user, assignment_id):
    row = scoped_assignments(db, user).filter(CoachingAssignment.id == assignment_id).with_for_update().first()
    if not row:
        raise HTTPException(404, "Coaching assignment not found.")
    return row


@router.get("")
def list_assignments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = scoped_assignments(db, user).order_by(CoachingAssignment.created_at.desc()).limit(100).all()
    return [assignment_out(row, db) for row in rows]


@router.post("", status_code=201)
def assign(body: AssignmentCreate, db: Session = Depends(get_db), user: User = Depends(manager)):
    call = accessible_call(db, user, body.call_id)
    if not call.analysis or call.analysis.source_mode == "legacy":
        raise HTTPException(409, "Choose a source-verified scorecard first.")
    if body.skill not in (call.analysis.scores or {}):
        raise HTTPException(422, "Choose a category from this call's rubric.")
    if aware(body.due_at) < utcnow() - timedelta(minutes=1):
        raise HTTPException(422, "The due date must be in the future.")
    instructions = body.instructions.strip()
    if organization_for(db, user).pii_redaction_enabled:
        instructions = redact(instructions)
    row = CoachingAssignment(organization_id=user.organization_id, rep_id=call.rep_id,
                             call_id=call.id, created_by=user.id, skill=body.skill, instructions=instructions,
                             due_at=body.due_at, baseline_score=call.analysis.scores[body.skill])
    db.add(row)
    db.flush()
    audit(db, user, "drill_assigned", {"assignment_id": row.id, "skill": row.skill})
    db.commit()
    return assignment_out(row, db)


@router.post("/{assignment_id}/complete")
def complete(assignment_id: str, body: PracticeSubmission, db: Session = Depends(get_db),
             user: User = Depends(get_current_user)):
    row = get_assignment(db, user, assignment_id)
    if row.state != "assigned":
        raise HTTPException(409, "This assignment has already been submitted.")
    row.practice_response = redact(body.response) if organization_for(db, user).pii_redaction_enabled else body.response
    row.state, row.completed_at = "completed", utcnow()
    audit(db, user, "drill_completed", {"assignment_id": row.id})
    db.commit()
    return assignment_out(row, db)


@router.post("/{assignment_id}/review")
def review(assignment_id: str, body: ManagerReview, db: Session = Depends(get_db), user: User = Depends(manager)):
    row = get_assignment(db, user, assignment_id)
    if row.state not in {"completed", "reviewed"}:
        raise HTTPException(409, "Review a submitted exercise first.")
    if body.verification_call_id:
        next_call = accessible_call(db, user, body.verification_call_id)
        original = accessible_call(db, user, row.call_id)
        if (not next_call.analysis or next_call.rep_id != row.rep_id or next_call.id == row.call_id
                or aware(next_call.created_at) <= aware(original.created_at)
                or next_call.is_sample != original.is_sample
                or next_call.analysis.source_mode != original.analysis.source_mode
                or next_call.analysis.rubric_snapshot != original.analysis.rubric_snapshot):
            raise HTTPException(422, "Use a later call by the same rep, scored against the same rubric version and source mode.")
        value = (next_call.analysis.scores or {}).get(row.skill)
        if value is None or row.baseline_score is None:
            raise HTTPException(422, "Both calls need an observed score for this skill.")
        row.verification_call_id, row.verified_score = next_call.id, value
    row.feedback = redact(body.feedback) if organization_for(db, user).pii_redaction_enabled else body.feedback
    row.state, row.reviewed_at = "reviewed", utcnow()
    audit(db, user, "drill_reviewed", {"assignment_id": row.id, "verified": bool(row.verification_call_id)})
    db.commit()
    return assignment_out(row, db)
