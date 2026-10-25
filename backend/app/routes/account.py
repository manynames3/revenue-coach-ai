from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.coaching_framework import normalize_coaching_framework
from app.database import get_db
from app.models.call import Call
from app.models.rep import Rep
from app.models.user import User
from app.models.workspace import AnalysisJob, AuditEvent, AuthSession, CoachingAssignment
from app.schemas.account import AccountOut, AccountUpdate, TrustControls, UserSeat
from app.schemas.rep import RepOut
from app.security import audit, get_current_user, manager, organization_for
from app.services.privacy import redact

router = APIRouter(prefix="/account", tags=["account"])


def account_out(db, organization, user):
    users = db.query(User).filter(User.organization_id == organization.id).order_by(User.created_at).all()
    reps = db.query(Rep).filter(Rep.organization_id == organization.id)
    if user.role == "rep":
        users = [user]
        reps = reps.filter(Rep.user_id == user.id)
    return AccountOut(
        organization=organization,
        users=[UserSeat.model_validate(member) for member in users],
        reps=[RepOut.model_validate(rep) for rep in reps.order_by(Rep.created_at).all()],
        coaching_framework=normalize_coaching_framework(organization.coaching_framework),
        framework_version=organization.framework_version, offer_context=organization.offer_context or {},
        processing_enabled=organization.processing_enabled,
        trust_controls=TrustControls(data_retention_days=organization.data_retention_days,
                                     recording_consent_required=organization.recording_consent_required,
                                     pii_redaction_enabled=organization.pii_redaction_enabled),
    )


@router.get("", response_model=AccountOut)
def get_account(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return account_out(db, organization_for(db, user), user)


@router.patch("", response_model=AccountOut)
def update_account(body: AccountUpdate, db: Session = Depends(get_db), user: User = Depends(manager)):
    organization = organization_for(db, user)
    if body.organization_name is not None:
        if not body.organization_name.strip() or len(body.organization_name) > 100:
            raise HTTPException(422, "Use a workspace name between 1 and 100 characters.")
        organization.name = body.organization_name.strip()
    if body.coaching_framework is not None:
        framework = normalize_coaching_framework(body.coaching_framework.model_dump())
        if framework != normalize_coaching_framework(organization.coaching_framework):
            organization.coaching_framework = framework
            organization.framework_version += 1
    if body.offer_context is not None:
        if set(body.offer_context) - {"offer", "buyer", "deal_value", "success_metric"} or any(len(value) > 2000 for value in body.offer_context.values()):
            raise HTTPException(422, "Keep company context within the supported fields and size limits.")
        organization.offer_context = body.offer_context
    if body.data_retention_days is not None:
        if not 1 <= body.data_retention_days <= 3650:
            raise HTTPException(422, "Retention must be between 1 and 3650 days.")
        organization.data_retention_days = body.data_retention_days
    if body.recording_consent_required is not None:
        organization.recording_consent_required = body.recording_consent_required
    if body.pii_redaction_enabled is not None:
        redaction_started = body.pii_redaction_enabled and not organization.pii_redaction_enabled
        organization.pii_redaction_enabled = body.pii_redaction_enabled
        if redaction_started:
            organization.offer_context = redact(organization.offer_context or {})
            for call in db.query(Call).filter(Call.organization_id == organization.id).all():
                for field in ("transcript", "transcript_segments", "lead_name", "lead_source", "consent_notes", "outcome"):
                    setattr(call, field, redact(getattr(call, field)))
                if call.analysis:
                    for field in ("summary", "strengths", "missed_opportunities", "objections", "buying_signals",
                                  "manager_notes", "evidence", "sales_psychology", "coaching_drill", "follow_up_sms",
                                  "follow_up_email_subject", "follow_up_email_body", "raw_ai_json", "score_reasons",
                                  "rubric_snapshot"):
                        setattr(call.analysis, field, redact(getattr(call.analysis, field)))
            for job in db.query(AnalysisJob).filter(AnalysisJob.organization_id == organization.id,
                                                   AnalysisJob.state.in_(["queued", "running"])).all():
                job.state, job.lease_token, job.lease_until = "queued", None, None
                job.attempts = 0
                job.rubric_snapshot = redact(job.rubric_snapshot)
            for assignment in db.query(CoachingAssignment).filter(CoachingAssignment.organization_id == organization.id).all():
                for field in ("instructions", "practice_response", "feedback"):
                    setattr(assignment, field, redact(getattr(assignment, field)))
    if organization.pii_redaction_enabled:
        organization.offer_context = redact(organization.offer_context or {})
        if organization.coaching_framework:
            clean_framework = redact(organization.coaching_framework)
            if clean_framework != organization.coaching_framework:
                organization.coaching_framework = clean_framework
                organization.framework_version += 1
    audit(db, user, "workspace_settings_changed", {
        "rubric_version": organization.framework_version, "retention_days": organization.data_retention_days,
        "contact_redaction": organization.pii_redaction_enabled,
    })
    db.commit()
    db.refresh(organization)
    return account_out(db, organization, user)


@router.get("/audit")
def audit_log(limit: int = 50, db: Session = Depends(get_db), user: User = Depends(manager)):
    events = db.query(AuditEvent).filter(AuditEvent.organization_id == user.organization_id).order_by(
        AuditEvent.created_at.desc()).limit(min(100, max(1, limit))).all()
    return [{"id": row.id, "action": row.action, "created_at": row.created_at, "details": row.details} for row in events]


class MemberUpdate(BaseModel):
    active: bool
    role: str = Field(pattern=r"^(manager|rep)$")


@router.patch("/members/{member_id}")
def update_member(member_id: str, body: MemberUpdate, db: Session = Depends(get_db), user: User = Depends(manager)):
    organization_for(db, user)
    # A role may change while this request waits; refresh the identity map under the lock.
    members = db.query(User).filter(User.organization_id == user.organization_id).populate_existing().with_for_update().all()
    if not user.active or user.role != "manager":
        raise HTTPException(403, "A current manager account is required.")
    member = next((item for item in members if item.id == member_id), None)
    if not member:
        raise HTTPException(404, "Member not found.")
    if member.role == "manager" and (not body.active or body.role != "manager"):
        if not any(item.id != member.id and item.active and item.role == "manager" for item in members):
            raise HTTPException(409, "Keep at least one active manager.")
    if body.role == "rep" and not db.query(Rep).filter(Rep.user_id == member.id).first():
        db.add(Rep(name=member.name, email=member.email, user_id=member.id, organization_id=member.organization_id))
    member.active, member.role = body.active, body.role
    db.query(AuthSession).filter(AuthSession.user_id == member.id).delete()
    audit(db, user, "member_updated", {"member_id": member.id, "role": body.role, "active": body.active})
    db.commit()
    return {"id": member.id, "active": member.active, "role": member.role}
