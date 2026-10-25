import secrets
from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.organization import Organization
from app.models.rep import Rep
from app.models.user import User
from app.models.workspace import AuthSession, Invitation
from app.models.password_reset import PasswordReset
from app.services.email import send_password_reset
from app.security import (COOKIE, aware, audit, check_origin, consume_limit, get_current_user,
                          hash_password, issue_session, manager, token_hash, user_out, utcnow,
                          validate_email, verify_password, request_peer)

router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


class Signup(Credentials):
    name: str = Field(min_length=1, max_length=100)
    workspace_name: str = Field(min_length=1, max_length=100)


class InviteBody(BaseModel):
    email: str = Field(max_length=254)
    role: Literal["manager", "rep"] = "rep"


class AcceptInvite(BaseModel):
    token: str = Field(min_length=20, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(max_length=128)


def public_limit(request: Request, db: Session, purpose: str):
    check_origin(request)
    peer = request_peer(request)
    consume_limit(db, f"{purpose}:{peer}", 20, 900)


@router.post("/signup", status_code=201)
def signup(body: Signup, request: Request, response: Response, db: Session = Depends(get_db)):
    public_limit(request, db, "signup")
    email = validate_email(body.email)
    password_hash = hash_password(body.password)
    if not body.name.strip() or not body.workspace_name.strip():
        raise HTTPException(422, "Name and workspace name are required.")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "This account could not be created. Try signing in.")
    organization = Organization(name=body.workspace_name.strip())
    db.add(organization)
    db.flush()
    user = User(email=email, name=body.name.strip(), password_hash=password_hash,
                organization_id=organization.id, role="manager")
    db.add(user)
    try:
        db.flush()
        audit(db, user, "workspace_created")
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This account could not be created. Try signing in.")
    return issue_session(db, user, response)


@router.post("/login")
def login(body: Credentials, request: Request, response: Response, db: Session = Depends(get_db)):
    public_limit(request, db, "login")
    email = validate_email(body.email)
    consume_limit(db, f"login-email:{email}", 10, 900)
    user = db.query(User).filter(User.email == email, User.active.is_(True)).first()
    if not user:
        hash_password("dummy-not-a-real-password")
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Email or password is incorrect.")
    audit(db, user, "signed_in")
    return issue_session(db, user, response)


@router.get("/me")
def me(request: Request, response: Response, user: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store"
    return {"user": user_out(user), "csrf_token": request.state.auth_session.csrf_token}


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db),
           user: User = Depends(get_current_user)):
    db.delete(request.state.auth_session)
    audit(db, user, "signed_out")
    db.commit()
    response.delete_cookie(COOKIE, path="/", secure=settings.session_cookie_secure,
                           samesite=settings.session_cookie_samesite)


@router.get("/invitations")
def invitations(db: Session = Depends(get_db), user: User = Depends(manager)):
    rows = db.query(Invitation).filter(Invitation.organization_id == user.organization_id,
                                      Invitation.accepted_at.is_(None), Invitation.expires_at > utcnow()).all()
    return [{"id": row.id, "email": row.email, "role": row.role, "expires_at": row.expires_at} for row in rows]


@router.post("/invitations", status_code=201)
def invite(body: InviteBody, db: Session = Depends(get_db), user: User = Depends(manager)):
    email = validate_email(body.email)
    consume_limit(db, f"invites:{user.organization_id}", 50, 86400)
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "That email already has an account.")
    db.query(Invitation).filter(Invitation.organization_id == user.organization_id,
                                Invitation.email == email, Invitation.accepted_at.is_(None)).delete()
    token = secrets.token_urlsafe(32)
    invitation = Invitation(organization_id=user.organization_id, email=email, role=body.role,
                            token_hash=token_hash(token), expires_at=utcnow() + timedelta(days=7))
    db.add(invitation)
    audit(db, user, "invitation_created", {"role": body.role})
    db.commit()
    return {"id": invitation.id, "url": f"{settings.frontend_url}/accept-invite#token={token}",
            "expires_at": invitation.expires_at}


@router.delete("/invitations/{invite_id}", status_code=204)
def revoke(invite_id: str, db: Session = Depends(get_db), user: User = Depends(manager)):
    row = db.query(Invitation).filter(Invitation.id == invite_id,
                                      Invitation.organization_id == user.organization_id).first()
    if not row:
        raise HTTPException(404, "Invitation not found.")
    db.delete(row)
    audit(db, user, "invitation_revoked", {"invitation_id": invite_id})
    db.commit()


@router.post("/accept-invite", status_code=201)
def accept_invite(body: AcceptInvite, request: Request, response: Response, db: Session = Depends(get_db)):
    public_limit(request, db, "accept-invite")
    encoded = hash_password(body.password)
    row = db.query(Invitation).filter(Invitation.token_hash == token_hash(body.token)).first()
    if not row or row.accepted_at or aware(row.expires_at) <= utcnow():
        raise HTTPException(400, "This invitation is expired or has already been used.")
    if not body.name.strip():
        raise HTTPException(422, "Name is required.")
    consumed = db.execute(update(Invitation).where(Invitation.id == row.id, Invitation.accepted_at.is_(None),
                                                  Invitation.expires_at > utcnow()).values(accepted_at=utcnow())
                          .execution_options(synchronize_session=False)).rowcount
    if not consumed:
        db.rollback()
        raise HTTPException(400, "This invitation has already been used.")
    user = User(name=body.name.strip(), email=row.email, password_hash=encoded,
                organization_id=row.organization_id, role=row.role)
    db.add(user)
    try:
        db.flush()
        if row.role == "rep":
            profile = db.query(Rep).filter(Rep.organization_id == row.organization_id,
                                           Rep.email == row.email, Rep.user_id.is_(None)).first()
            if profile:
                profile.user_id = user.id
            else:
                db.add(Rep(name=user.name, email=user.email, user_id=user.id, organization_id=user.organization_id))
        audit(db, user, "invitation_accepted")
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This account could not be created.")
    return issue_session(db, user, response)


class PasswordChange(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(max_length=128)


@router.post("/password")
def change_password(body: PasswordChange, response: Response, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect.")
    user.password_hash = hash_password(body.new_password)
    db.query(AuthSession).filter(AuthSession.user_id == user.id).delete()
    audit(db, user, "password_changed")
    return issue_session(db, user, response)


class ForgotPassword(BaseModel):
    email: str = Field(max_length=254)


class ResetPassword(BaseModel):
    token: str = Field(min_length=20, max_length=100)
    password: str = Field(max_length=128)


@router.post("/forgot-password")
def forgot_password(body: ForgotPassword, request: Request, db: Session = Depends(get_db)):
    public_limit(request, db, "password-reset")
    if not settings.auth_email_from:
        raise HTTPException(503, "Password recovery email is not configured. Contact your workspace operator.")
    email = validate_email(body.email)
    user = db.query(User).filter(User.email == email, User.active.is_(True)).first()
    if user:
        token = secrets.token_urlsafe(32)
        row = PasswordReset(id=token_hash(token), user_id=user.id, expires_at=utcnow() + timedelta(minutes=30))
        db.add(row)
        db.commit()
        try:
            send_password_reset(email, token)
        except Exception as exc:
            db.delete(row)
            db.commit()
            raise HTTPException(503, "Recovery email is temporarily unavailable.") from exc
    return {"message": "If this email has an account, a recovery link will be sent."}


@router.post("/reset-password")
def reset_password(body: ResetPassword, request: Request, db: Session = Depends(get_db)):
    public_limit(request, db, "reset-password")
    encoded = hash_password(body.password)
    row = db.get(PasswordReset, token_hash(body.token))
    if not row or row.used_at or aware(row.expires_at) <= utcnow():
        raise HTTPException(400, "This recovery link is expired or has already been used.")
    changed = db.execute(update(PasswordReset).where(PasswordReset.id == row.id, PasswordReset.used_at.is_(None),
                                                     PasswordReset.expires_at > utcnow()).values(used_at=utcnow())
                         .execution_options(synchronize_session=False)).rowcount
    if not changed:
        db.rollback()
        raise HTTPException(400, "This recovery link has already been used.")
    user = db.get(User, row.user_id)
    if not user or not user.active:
        raise HTTPException(400, "This recovery link is invalid.")
    user.password_hash = encoded
    db.query(AuthSession).filter(AuthSession.user_id == user.id).delete()
    db.query(PasswordReset).filter(PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None)).delete()
    audit(db, user, "password_recovered")
    db.commit()
    return {"message": "Password updated. Sign in with your new password."}
