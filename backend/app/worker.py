"""Run as a persistent worker, or invoke handler on a recurring Lambda schedule."""
import argparse
import time

from sqlalchemy.orm import Session

from app.database import engine
from app.models import workspace  # noqa: F401
from app.models.workspace import AuthSession, Invitation, RateLimit
from app.models.password_reset import PasswordReset
from app.security import utcnow
from app.services.analysis_jobs import process_once, recover_exhausted_jobs
from app.services.audio_jobs import refresh_transcriptions
from app.services.privacy import purge_expired


def maintenance():
    with Session(engine) as db:
        recover_exhausted_jobs(db)
        report = purge_expired(db)
        refresh_transcriptions(db)
        db.query(AuthSession).filter(AuthSession.expires_at < utcnow()).delete()
        db.query(RateLimit).filter(RateLimit.expires_at < utcnow()).delete()
        db.query(Invitation).filter(Invitation.expires_at < utcnow()).delete()
        db.query(PasswordReset).filter(PasswordReset.expires_at < utcnow()).delete()
        db.commit()
        return report


def handler(event, context):
    report = maintenance()
    processed = 0
    while processed < 5 and (context is None or context.get_remaining_time_in_millis() > 60000) and process_once():
        processed += 1
    return {**report, "processed": processed}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    if args.once:
        print(handler({}, None))
        return
    last_maintenance = 0
    while True:
        if time.monotonic() - last_maintenance > 60:
            maintenance()
            last_maintenance = time.monotonic()
        if not process_once():
            time.sleep(2)


if __name__ == "__main__":
    main()
