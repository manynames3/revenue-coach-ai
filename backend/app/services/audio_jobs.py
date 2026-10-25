from app.models.call import Call
from app.models.organization import Organization
from app.security import audit, utcnow
from app.services.privacy import delete_artifacts, redact
from app.services.transcript import transcript_text
from app.services.transcription import TranscriptionService
from app.config import settings


def refresh_transcriptions(db):
    # Row locks prevent overlapping scheduled workers from processing the same job.
    calls = db.query(Call).filter(Call.status == "transcribing").with_for_update(skip_locked=True).limit(10).all()
    for call in calls:
        try:
            service = TranscriptionService()
            job = service.get_job_status(call.transcription_job_id)
            if job["TranscriptionJobStatus"] == "COMPLETED":
                segments = service.get_transcript_segments(call.transcription_job_id)
                org = db.get(Organization, call.organization_id)
                if not segments or len(transcript_text(segments)) > settings.max_transcript_characters:
                    call.status, call.failure_reason = "failed", "The transcript is empty or exceeds the supported size."
                    continue
                if org.pii_redaction_enabled:
                    segments = redact(segments)
                    delete_artifacts(call)
                    call.audio_s3_key, call.transcription_job_id = None, None
                call.transcript_segments, call.transcript = segments, transcript_text(segments)
                call.status, call.failure_reason = "transcribed", None
                call.transcribed_at = utcnow()
                audit(db, None, "transcription_completed", {"call_id": call.id}, org.id)
            elif job["TranscriptionJobStatus"] == "FAILED":
                call.status = "failed"
                call.failure_reason = "Audio transcription failed. Retry the upload."
        except Exception:
            call.failure_reason = "Audio processing is waiting for a dependency. The worker will retry."
    db.commit()
