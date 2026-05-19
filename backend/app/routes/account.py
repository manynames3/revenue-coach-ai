from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.coaching_framework import normalize_coaching_framework
from app.database import get_db
from app.models.organization import Organization
from app.models.rep import Rep
from app.models.user import User
from app.schemas.account import AccountOut, AccountUpdate, TrustControls, UserSeat
from app.schemas.rep import RepOut

router = APIRouter(prefix="/account", tags=["account"])


def _get_default_org(db: Session) -> Organization:
    organization = db.query(Organization).filter(Organization.id == "default").first()
    if not organization:
        organization = Organization(id="default", name="Default Org")
        db.add(organization)
        db.commit()
        db.refresh(organization)
    return organization


def _account_out(db: Session, organization: Organization) -> AccountOut:
    users = db.query(User).filter(User.organization_id == organization.id).order_by(User.created_at.desc()).all()
    reps = db.query(Rep).filter(Rep.organization_id == organization.id).order_by(Rep.created_at.desc()).all()
    return AccountOut(
        organization=organization,
        users=[UserSeat(id=user.id, email=user.email, created_at=user.created_at) for user in users],
        reps=[RepOut.model_validate(rep) for rep in reps],
        coaching_framework=normalize_coaching_framework(organization.coaching_framework),
        trust_controls=TrustControls(
            data_retention_days=organization.data_retention_days or 90,
            recording_consent_required=organization.recording_consent_required
            if organization.recording_consent_required is not None
            else True,
            pii_redaction_enabled=organization.pii_redaction_enabled or False,
        ),
    )


@router.get("", response_model=AccountOut)
def get_account(db: Session = Depends(get_db)):
    organization = _get_default_org(db)
    return _account_out(db, organization)


@router.patch("", response_model=AccountOut)
def update_account(body: AccountUpdate, db: Session = Depends(get_db)):
    organization = _get_default_org(db)

    if body.organization_name is not None:
        name = body.organization_name.strip()
        if not name:
            raise HTTPException(400, "Organization name cannot be blank")
        organization.name = name

    if body.coaching_framework is not None:
        organization.coaching_framework = normalize_coaching_framework(body.coaching_framework.model_dump())

    if body.data_retention_days is not None:
        if body.data_retention_days < 1 or body.data_retention_days > 3650:
            raise HTTPException(400, "Data retention must be between 1 and 3650 days")
        organization.data_retention_days = body.data_retention_days

    if body.recording_consent_required is not None:
        organization.recording_consent_required = body.recording_consent_required

    if body.pii_redaction_enabled is not None:
        organization.pii_redaction_enabled = body.pii_redaction_enabled

    db.commit()
    db.refresh(organization)
    return _account_out(db, organization)
