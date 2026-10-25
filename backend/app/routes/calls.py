from datetime import timedelta
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.database import get_db
from app.models.call import Call
from app.models.call_analysis import CallAnalysis
from app.models.user import User
from app.models.workspace import AnalysisJob
from app.schemas.call import CallCreate, CallOut, CallWithAnalysis, TranscriptionStatusResponse, UploadUrlResponse
from app.schemas.call_analysis import AnalysisOut, FollowUpEmail
from app.security import (accessible_call, accessible_rep, audit, consume_limit, get_current_user,
                          manager, organization_for, scoped_calls, utcnow)
from app.security import require_processing_access
from app.services.analysis_jobs import snapshot_for
from app.services.privacy import clear_verification, delete_artifacts, redact
from app.services.transcript import parse_transcript, transcript_text
from app.services.transcription import TranscriptionService

router = APIRouter(prefix="/calls", tags=["calls"])


@router.post("/upload-url", response_model=UploadUrlResponse)
def get_upload_url(call_id: str, file_name: str, file_type: str, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    call = accessible_call(db, user, call_id)
    if call.status in {"transcribing", "analyzing", "analyzed"} or call.is_sample:
        raise HTTPException(409, "This call cannot accept another audio upload.")
    if call.transcript:
        raise HTTPException(409, "This call already has a transcript. Create a new call to change its source.")
    org = organization_for(db, user)
    require_processing_access(org)
    if org.recording_consent_required and not call.consent_confirmed:
        raise HTTPException(400, "Confirm recording consent before uploading audio.")
    try:
        TranscriptionService.validate_audio_type(file_type)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    consume_limit(db, f"uploads:{user.organization_id}", 100, 86400)
    service = TranscriptionService()
    if call.audio_s3_key or call.transcription_job_id:
        try:
            delete_artifacts(call)
        except Exception as exc:
            raise HTTPException(502, "Previous audio cleanup failed. Retry the upload.") from exc
        call.transcription_job_id = None
    presigned = service.generate_presigned_post(file_name, file_type, prefix=f"uploads/{org.id}/{call.id}/")
    call.audio_s3_key = presigned["fields"]["key"]
    audit(db, user, "audio_upload_authorized", {"call_id": call.id})
    db.commit()
    return UploadUrlResponse(url=presigned["url"], fields=presigned["fields"], key=presigned["fields"]["key"])


@router.post("/{call_id}/transcribe", response_model=CallOut)
def start_transcription(call_id: str, s3_key: str, db: Session = Depends(get_db),
                        user: User = Depends(get_current_user)):
    call = accessible_call(db, user, call_id)
    if s3_key != call.audio_s3_key or not s3_key.startswith(f"uploads/{user.organization_id}/{call.id}/"):
        raise HTTPException(403, "This upload does not belong to this call.")
    if call.transcription_job_id:
        return call
    if call.transcript or call.status in {"analyzing", "analyzed"}:
        raise HTTPException(409, "This call already has a transcript or scorecard.")
    org = organization_for(db, user)
    require_processing_access(org)
    if org.recording_consent_required and not call.consent_confirmed:
        raise HTTPException(400, "Confirm recording consent before transcription.")
    service = TranscriptionService()
    job_name = f"transcribe-{call.id}"
    call.status = "transcribing"
    call.failure_reason = None
    call.transcription_started_at = utcnow()
    call.transcription_retry_count += 1
    try:
        service.start_transcription_job(f"s3://{service.bucket}/{s3_key}", job_name)
    except Exception as exc:
        call.status = "failed"
        call.failure_reason = "Transcription could not start. Retry your audio upload."
        db.commit()
        raise HTTPException(502, call.failure_reason) from exc
    call.transcription_job_id = job_name
    audit(db, user, "transcription_started", {"call_id": call.id})
    db.commit()
    db.refresh(call)
    return call


@router.get("/{call_id}/transcribe/status", response_model=TranscriptionStatusResponse)
def transcription_status(call_id: str, db: Session = Depends(get_db),
                         user: User = Depends(get_current_user)):
    call = accessible_call(db, user, call_id)
    if not call.transcription_job_id and not call.transcript:
        raise HTTPException(404, "Transcription job not found.")
    state = "COMPLETED" if call.transcript else "FAILED" if call.status == "failed" else "IN_PROGRESS"
    return TranscriptionStatusResponse(status=state, call_status=call.status,
                                        job_name=call.transcription_job_id or "", failure_reason=call.failure_reason)


@router.post("", response_model=CallOut, status_code=201)
def create_call(body: CallCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    org = organization_for(db, user)
    if body.organization_id and body.organization_id != org.id:
        raise HTTPException(403, "The workspace is determined by your account.")
    accessible_rep(db, user, body.rep_id)
    if org.recording_consent_required and not body.consent_confirmed:
        raise HTTPException(400, "Confirm permission to upload and analyze this conversation.")
    consume_limit(db, f"calls:{org.id}", 300, 86400)
    data = body.model_dump(exclude={"organization_id"})
    if org.pii_redaction_enabled:
        data = {key: redact(value) if key != "rep_id" else value for key, value in data.items()}
    call = Call(**data, organization_id=org.id)
    if call.transcript:
        if not call.transcript.strip() or len(call.transcript) > settings.max_transcript_characters:
            raise HTTPException(422, "Provide a non-empty transcript within the configured size limit.")
        call.transcript_segments = parse_transcript(call.transcript)
        call.status = "transcribed"
        call.transcribed_at = utcnow()
    db.add(call)
    db.flush()
    audit(db, user, "call_created", {"call_id": call.id, "consent_confirmed": call.consent_confirmed})
    db.commit()
    db.refresh(call)
    return call


@router.get("", response_model=list[CallOut])
def list_calls(limit: int = 100, offset: int = 0, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    return scoped_calls(db, user).order_by(Call.created_at.desc()).offset(max(0, offset)).limit(min(200, max(1, limit))).all()


@router.get("/{call_id}", response_model=CallWithAnalysis)
def get_call(call_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    call = accessible_call(db, user, call_id)
    result = CallWithAnalysis(**CallOut.model_validate(call).model_dump(), analysis=None)
    if call.analysis:
        result.analysis = _analysis_to_out(call.analysis)
    return result


@router.post("/{call_id}/analyze", status_code=202)
def analyze_call(call_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    call = accessible_call(db, user, call_id)
    if not call.transcript:
        raise HTTPException(400, "A transcript is required.")
    if call.status == "transcribing":
        raise HTTPException(409, "Wait for transcription to finish before analysis.")
    org = organization_for(db, user)
    if org.recording_consent_required and not call.consent_confirmed:
        raise HTTPException(400, "Record permission to process this conversation before analysis.")
    if call.analysis:
        return {"call_id": call.id, "state": "done"}
    existing = db.query(AnalysisJob).filter(AnalysisJob.call_id == call.id).first()
    if existing and existing.state in {"queued", "running"}:
        return {"call_id": call.id, "job_id": existing.id, "state": existing.state}
    if not call.is_sample and (settings.mock_ai or not settings.zai_api_key):
        call.failure_reason = "Real scoring is unavailable. Your call is saved; use the labeled sample or retry when scoring is enabled."
        db.commit()
        raise HTTPException(503, call.failure_reason)
    if not call.is_sample and not org.processing_enabled:
        call.failure_reason = "Real call processing is not enabled for this workspace. Request a pilot or contact your workspace operator."
        db.commit()
        require_processing_access(org)
    consume_limit(db, f"analysis:{org.id}", settings.daily_analysis_limit, 86400)
    if existing:
        existing.state, existing.error, existing.attempts = "queued", None, 0
        existing.lease_token, existing.lease_until = None, None
        existing.rubric_snapshot = snapshot_for(org)
        job = existing
    else:
        job = AnalysisJob(call_id=call.id, organization_id=org.id, rubric_snapshot=snapshot_for(org))
        db.add(job)
    call.status = "analyzing"
    call.failure_reason = None
    call.analysis_started_at = utcnow()
    call.analysis_retry_count += 1
    audit(db, user, "analysis_queued", {"call_id": call.id, "rubric_version": org.framework_version})
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        job = db.query(AnalysisJob).filter(AnalysisJob.call_id == call.id).first()
        if not job:
            raise HTTPException(409, "The call changed. Refresh and retry.")
    return {"call_id": call.id, "job_id": job.id, "state": job.state}


class ConsentConfirmation(BaseModel):
    consent_confirmed: Literal[True]
    consent_notes: str = Field(default="", max_length=2000)


@router.patch("/{call_id}/consent", response_model=CallOut)
def confirm_consent(call_id: str, body: ConsentConfirmation, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    call = accessible_call(db, user, call_id)
    call.consent_confirmed = True
    call.consent_notes = redact(body.consent_notes) if organization_for(db, user).pii_redaction_enabled else body.consent_notes
    audit(db, user, "consent_recorded", {"call_id": call.id})
    db.commit()
    return call


@router.delete("/{call_id}", status_code=204)
def delete_call(call_id: str, db: Session = Depends(get_db), user: User = Depends(manager)):
    call = accessible_call(db, user, call_id)
    try:
        delete_artifacts(call)
    except Exception as exc:
        raise HTTPException(502, "Audio cleanup failed. The call was kept so deletion can be retried.") from exc
    audit(db, user, "call_deleted", {"call_id": call.id})
    clear_verification(db, call.id)
    db.delete(call)
    db.commit()
    return Response(status_code=204)


class ScorecardFeedback(BaseModel):
    rating: int = Field(ge=1, le=5)
    review_seconds: int | None = Field(default=None, ge=1, le=3600)


@router.post("/{call_id}/feedback")
def scorecard_feedback(call_id: str, body: ScorecardFeedback, db: Session = Depends(get_db),
                       user: User = Depends(manager)):
    call = accessible_call(db, user, call_id)
    if not call.analysis or call.analysis.source_mode == "legacy":
        raise HTTPException(409, "Review a source-verified scorecard first.")
    call.analysis.feedback_rating = body.rating
    call.analysis.review_seconds = body.review_seconds
    call.analysis.feedback_at = utcnow()
    audit(db, user, "scorecard_feedback", {"call_id": call_id, "rating": body.rating,
                                         "review_seconds": body.review_seconds})
    db.commit()
    return _analysis_to_out(call.analysis)


def _analysis_to_out(analysis: CallAnalysis):
    values = {key: getattr(analysis, key) for key in (
        "id", "call_id", "overall_score", "summary", "scores", "coaching_drill", "follow_up_sms", "created_at",
        "source_mode", "model_name", "rubric_snapshot", "evidence_coverage",
        "feedback_rating", "review_seconds", "feedback_at")}
    for key in ("strengths", "missed_opportunities", "objections", "buying_signals", "manager_notes", "evidence"):
        values[key] = getattr(analysis, key) or []
    values["score_reasons"] = analysis.score_reasons or {}
    values["sales_psychology"] = analysis.sales_psychology
    values["follow_up_email"] = FollowUpEmail(subject=analysis.follow_up_email_subject or "",
                                             body=analysis.follow_up_email_body or "")
    return AnalysisOut(**values)
