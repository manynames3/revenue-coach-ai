import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.call_status import CallStatus
from app.database import get_db
from app.models.call import Call
from app.models.call_analysis import CallAnalysis
from app.schemas.call import (
    CallCreate,
    CallOut,
    CallWithAnalysis,
    TranscriptionStatusResponse,
    UploadUrlResponse,
)
from app.schemas.call_analysis import (
    AIAnalysisResult,
    AnalysisOut,
    BuyingSignal,
    EvidenceItem,
    FollowUpEmail,
    Objection,
    ScoreBreakdown,
    SalesPsychology,
)
from app.services.sales_analyzer import SalesAnalyzer
from app.services.transcription import TranscriptionService
from app.models.organization import Organization

router = APIRouter(prefix="/calls", tags=["calls"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/upload-url", response_model=UploadUrlResponse)
def get_upload_url(file_name: str, file_type: str):
    try:
        TranscriptionService.validate_audio_type(file_type)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    service = TranscriptionService()
    presigned = service.generate_presigned_post(file_name, file_type)
    return UploadUrlResponse(
        url=presigned["url"],
        fields=presigned["fields"],
        key=presigned["fields"]["key"],
    )


@router.post("/{call_id}/transcribe", response_model=CallOut)
def start_transcription(call_id: str, s3_key: str, db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(404, "Call not found")

    if call.transcription_job_id and call.status in {
        CallStatus.TRANSCRIBING.value,
        CallStatus.TRANSCRIBED.value,
        CallStatus.ANALYZING.value,
        CallStatus.ANALYZED.value,
    }:
        return call

    service = TranscriptionService()
    s3_uri = f"s3://{service.bucket}/{s3_key}"
    job_name = f"transcribe-{call_id}-{uuid.uuid4().hex[:8]}"

    call.status = CallStatus.TRANSCRIBING.value
    call.failure_reason = None
    call.audio_s3_key = s3_key
    call.transcription_started_at = _now()
    call.transcription_retry_count = (call.transcription_retry_count or 0) + 1

    try:
        service.start_transcription_job(s3_uri, job_name)
    except Exception as exc:
        call.status = CallStatus.FAILED.value
        call.failure_reason = f"Failed to start transcription: {exc}"
        db.commit()
        raise HTTPException(502, "Failed to start transcription job") from exc

    call.transcription_job_id = job_name
    db.commit()
    db.refresh(call)
    return call


@router.get("/{call_id}/transcribe/status", response_model=TranscriptionStatusResponse)
def get_transcription_status(call_id: str, db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call or not call.transcription_job_id:
        raise HTTPException(404, "Transcription job not found for this call")

    if call.status == CallStatus.TRANSCRIBED.value and call.transcript:
        return TranscriptionStatusResponse(
            status="COMPLETED",
            call_status=CallStatus.TRANSCRIBED,
            job_name=call.transcription_job_id,
            failure_reason=call.failure_reason,
        )

    service = TranscriptionService()
    job = service.get_job_status(call.transcription_job_id)
    status = job["TranscriptionJobStatus"]

    if status == "COMPLETED":
        transcript = service.get_transcript_text(call.transcription_job_id)
        call.transcript = transcript
        call.status = CallStatus.TRANSCRIBED.value
        call.failure_reason = None
        call.transcribed_at = _now()
        db.commit()
    elif status == "FAILED":
        call.status = CallStatus.FAILED.value
        call.failure_reason = job.get("FailureReason") or "Transcription job failed"
        db.commit()
    elif call.status != CallStatus.TRANSCRIBING.value:
        call.status = CallStatus.TRANSCRIBING.value
        db.commit()

    db.refresh(call)
    return TranscriptionStatusResponse(
        status=status,
        call_status=CallStatus(call.status),
        job_name=call.transcription_job_id,
        failure_reason=call.failure_reason,
    )


@router.post("", response_model=CallOut)
def create_call(body: CallCreate, db: Session = Depends(get_db)):
    call = Call(**body.model_dump())
    if call.transcript:
        call.status = CallStatus.TRANSCRIBED.value
        call.transcribed_at = _now()
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


@router.get("", response_model=list[CallOut])
def list_calls(db: Session = Depends(get_db)):
    return db.query(Call).order_by(Call.created_at.desc()).all()


@router.get("/{call_id}", response_model=CallWithAnalysis)
def get_call(call_id: str, db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(404, "Call not found")
    analysis = db.query(CallAnalysis).filter(CallAnalysis.call_id == call_id).first()
    result = CallWithAnalysis(**CallOut.model_validate(call).model_dump(), analysis=None)
    if analysis:
        result.analysis = _analysis_to_out(analysis)
    return result


@router.post("/{call_id}/analyze", response_model=AnalysisOut)
def analyze_call(call_id: str, db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(404, "Call not found")
    if not call.transcript:
        raise HTTPException(400, "Call has no transcript")

    existing = db.query(CallAnalysis).filter(CallAnalysis.call_id == call_id).first()
    if existing:
        if call.status != CallStatus.ANALYZED.value:
            call.status = CallStatus.ANALYZED.value
            call.analyzed_at = existing.created_at
            db.commit()
        return _analysis_to_out(existing)

    call.status = CallStatus.ANALYZING.value
    call.failure_reason = None
    call.analysis_started_at = _now()
    call.analysis_retry_count = (call.analysis_retry_count or 0) + 1
    db.commit()

    analyzer = SalesAnalyzer()
    organization = db.query(Organization).filter(Organization.id == call.organization_id).first()
    try:
        result: AIAnalysisResult = analyzer.analyze(
            call.transcript, organization.coaching_framework if organization else None
        )
    except Exception as exc:
        call.status = CallStatus.FAILED.value
        call.failure_reason = f"Analysis failed: {exc}"
        db.commit()
        raise HTTPException(502, "Failed to analyze call") from exc

    analysis = CallAnalysis(
        call_id=call_id,
        overall_score=result.overall_score,
        summary=result.summary,
        scores=result.scores.model_dump(),
        strengths=result.strengths,
        missed_opportunities=result.missed_opportunities,
        objections=[o.model_dump() for o in result.objections],
        buying_signals=[b.model_dump() for b in result.buying_signals],
        manager_notes=result.manager_notes,
        evidence=[e.model_dump() for e in result.evidence],
        sales_psychology=result.sales_psychology.model_dump(),
        coaching_drill=result.coaching_drill,
        follow_up_sms=result.follow_up_sms,
        follow_up_email_subject=result.follow_up_email.subject,
        follow_up_email_body=result.follow_up_email.body,
        raw_ai_json=result.model_dump(),
    )
    db.add(analysis)
    call.status = CallStatus.ANALYZED.value
    call.analyzed_at = _now()
    db.commit()
    db.refresh(analysis)

    return _analysis_to_out(analysis)


@router.delete("/{call_id}", status_code=204)
def delete_call(call_id: str, db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(404, "Call not found")

    if call.audio_s3_key or call.transcription_job_id:
        service = TranscriptionService()
        try:
            service.delete_call_artifacts(call.audio_s3_key, call.transcription_job_id)
        except Exception as exc:
            raise HTTPException(502, "Failed to delete audio artifacts") from exc

    db.delete(call)
    db.commit()
    return Response(status_code=204)


def _analysis_to_out(a: CallAnalysis) -> AnalysisOut:
    scores = ScoreBreakdown(**a.scores) if a.scores else None
    email = (
        FollowUpEmail(subject=a.follow_up_email_subject or "", body=a.follow_up_email_body or "")
        if a.follow_up_email_subject or a.follow_up_email_body
        else None
    )
    return AnalysisOut(
        id=a.id,
        call_id=a.call_id,
        overall_score=a.overall_score,
        summary=a.summary,
        scores=scores,
        strengths=a.strengths or [],
        missed_opportunities=a.missed_opportunities or [],
        objections=[Objection(**o) for o in a.objections] if a.objections else [],
        buying_signals=[BuyingSignal(**b) for b in a.buying_signals] if a.buying_signals else [],
        manager_notes=a.manager_notes or [],
        evidence=[EvidenceItem(**e) for e in a.evidence] if a.evidence else [],
        sales_psychology=SalesPsychology(**a.sales_psychology) if a.sales_psychology else None,
        coaching_drill=a.coaching_drill,
        follow_up_sms=a.follow_up_sms,
        follow_up_email=email,
        raw_ai_json=json.dumps(a.raw_ai_json) if a.raw_ai_json else None,
        created_at=a.created_at,
    )
