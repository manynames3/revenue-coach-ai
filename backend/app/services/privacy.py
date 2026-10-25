import re
from datetime import timedelta

from app.models.call import Call
from app.models.organization import Organization
from app.models.workspace import CoachingAssignment
from app.security import audit, utcnow

EMAIL = re.compile(r"(?<![\w.-])[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
PHONE = re.compile(r"(?<!\w)(?:\+?\d{1,3}[-. ]?)?(?:\(\d{3}\)|\d{3})[-. ]\d{3}[-. ]\d{4}(?!\d)")
CARD = re.compile(r"(?<!\d)(?:\d[ -]?){13,19}(?!\d)")
RUBRIC_KEY = re.compile(r"^[a-z][a-z0-9_]{1,39}$")


def redact(value):
    if isinstance(value, str):
        return CARD.sub("[REDACTED NUMBER]", PHONE.sub("[REDACTED PHONE]", EMAIL.sub("[REDACTED EMAIL]", value)))
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, dict):
        # Validated scoring identifiers are not human-facing contact data.
        return {key: item if key in {"key", "score_area"} and isinstance(item, str) and RUBRIC_KEY.fullmatch(item)
                else redact(item) for key, item in value.items()}
    return value


def delete_artifacts(call):
    if call.audio_s3_key or call.transcription_job_id:
        from app.services.transcription import TranscriptionService
        TranscriptionService().delete_call_artifacts(call.audio_s3_key, call.transcription_job_id)


def clear_verification(db, call_id):
    db.query(CoachingAssignment).filter(CoachingAssignment.verification_call_id == call_id).update(
        {"verification_call_id": None, "verified_score": None}, synchronize_session="fetch")


def purge_expired(db):
    deleted = 0
    failures = 0
    for org in db.query(Organization).all():
        cutoff = utcnow() - timedelta(days=org.data_retention_days)
        for call in db.query(Call).filter(Call.organization_id == org.id, Call.created_at < cutoff).all():
            try:
                delete_artifacts(call)
            except Exception:
                audit(db, None, "retention_cleanup_failed", {"call_id": call.id}, org.id)
                db.commit()
                failures += 1
                continue
            audit(db, None, "retention_deleted", {"call_id": call.id}, org.id)
            clear_verification(db, call.id)
            db.delete(call)
            db.commit()
            deleted += 1
    return {"deleted": deleted, "failed": failures}
