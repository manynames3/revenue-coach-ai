import hashlib
import hmac
import ipaddress
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.call import Call
from app.models.organization import Organization
from app.models.rep import Rep
from app.models.user import User
from app.models.workspace import AuditEvent, AuthSession, RateLimit

COOKIE = "revenuecoach_session"


def utcnow():
    return datetime.now(timezone.utc)


def aware(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def token_hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def validate_email(value: str) -> str:
    value = value.strip().lower()
    if len(value) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
        raise HTTPException(422, "Enter a valid email address.")
    return value


def hash_password(value: str) -> str:
    if len(value) < 12 or len(value) > 128:
        raise HTTPException(422, "Use a password between 12 and 128 characters.")
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", value.encode(), bytes.fromhex(salt), 600000).hex()
    return "$".join(("pbkdf2_sha256", "600000", salt, digest))


def verify_password(value: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt, digest = stored.split("$")
        if algorithm != "pbkdf2_sha256" or not 600000 <= int(iterations) <= 2000000 or len(value) > 128:
            return False
        actual = hashlib.pbkdf2_hmac("sha256", value.encode(), bytes.fromhex(salt), int(iterations)).hex()
        return hmac.compare_digest(actual, digest)
    except (ValueError, TypeError):
        return False


def check_origin(request: Request):
    origin = request.headers.get("origin")
    if origin and origin not in settings.cors_origins:
        raise HTTPException(403, "This origin is not allowed.")


def request_peer(request: Request):
    if settings.proxy_secret and hmac.compare_digest(request.headers.get("X-RevenueCoach-Proxy-Secret", ""), settings.proxy_secret):
        try:
            return str(ipaddress.ip_address(request.headers.get("X-RevenueCoach-Client-IP", "")))
        except ValueError:
            pass
    return request.client.host if request.client else "unknown"


def consume_limit(db: Session, bucket: str, maximum: int, seconds: int):
    key = token_hash(bucket)
    now = utcnow()
    changed = db.execute(
        update(RateLimit).where(RateLimit.id == key, RateLimit.expires_at > now, RateLimit.count < maximum)
        .values(count=RateLimit.count + 1).execution_options(synchronize_session=False)
    ).rowcount
    if changed:
        db.commit()
        return
    existing = db.get(RateLimit, key)
    if existing and aware(existing.expires_at) > now:
        raise HTTPException(429, "Too many requests. Try again later.", headers={"Retry-After": str(seconds)})
    if existing:
        changed = db.execute(
            update(RateLimit).where(RateLimit.id == key, RateLimit.expires_at <= now)
            .values(count=1, expires_at=now + timedelta(seconds=seconds)).execution_options(synchronize_session=False)
        ).rowcount
        db.commit()
        if not changed:
            return consume_limit(db, bucket, maximum, seconds)
    else:
        db.add(RateLimit(id=key, count=1, expires_at=now + timedelta(seconds=seconds)))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return consume_limit(db, bucket, maximum, seconds)


def audit(db: Session, user: User | None, action: str, details: dict | None = None, organization_id: str | None = None):
    db.add(AuditEvent(
        organization_id=organization_id or user.organization_id,
        actor_id=user.id if user else None, action=action, details=details or {},
    ))


def issue_session(db: Session, user: User, response: Response):
    token = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(32)
    db.add(AuthSession(id=token_hash(token), user_id=user.id, csrf_token=csrf,
                       expires_at=utcnow() + timedelta(hours=settings.session_hours)))
    db.commit()
    response.set_cookie(COOKIE, token, httponly=True, secure=settings.session_cookie_secure,
                        samesite=settings.session_cookie_samesite,
                        max_age=settings.session_hours * 3600, path="/")
    response.headers["Cache-Control"] = "no-store"
    return {"user": user_out(user), "csrf_token": csrf}


def user_out(user: User):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role,
            "organization_id": user.organization_id}


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    raw = request.cookies.get(COOKIE, "")
    session = db.get(AuthSession, token_hash(raw)) if raw else None
    if not session or aware(session.expires_at) <= utcnow():
        raise HTTPException(401, "Sign in to continue.")
    user = db.get(User, session.user_id)
    if not user or not user.active:
        raise HTTPException(401, "Sign in to continue.")
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        check_origin(request)
        if not hmac.compare_digest(request.headers.get("X-CSRF-Token", ""), session.csrf_token):
            raise HTTPException(403, "Refresh your session before making changes.")
    request.state.auth_session = session
    return user


def manager(user: User = Depends(get_current_user)) -> User:
    if user.role != "manager":
        raise HTTPException(403, "A manager account is required.")
    return user


def organization_for(db: Session, user: User) -> Organization:
    organization = db.get(Organization, user.organization_id)
    if not organization:
        raise HTTPException(404, "Workspace not found.")
    return organization


def require_processing_access(organization):
    if not organization.processing_enabled:
        raise HTTPException(403, "Real call processing is not enabled for this workspace. Request a pilot or contact your workspace operator.")


def scoped_calls(db: Session, user: User):
    query = db.query(Call).filter(Call.organization_id == user.organization_id)
    if user.role == "rep":
        query = query.join(Rep, Call.rep_id == Rep.id).filter(Rep.user_id == user.id)
    return query


def accessible_call(db: Session, user: User, call_id: str) -> Call:
    call = scoped_calls(db, user).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(404, "Call not found.")
    return call


def accessible_rep(db: Session, user: User, rep_id: str) -> Rep:
    rep = db.query(Rep).filter(Rep.id == rep_id, Rep.organization_id == user.organization_id).first()
    if not rep or (user.role == "rep" and rep.user_id != user.id):
        raise HTTPException(404, "Rep not found.")
    return rep
