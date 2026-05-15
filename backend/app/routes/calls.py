import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.call import Call
from app.models.call_analysis import CallAnalysis
from app.schemas.call import CallCreate, CallOut, CallWithAnalysis, UploadUrlResponse
from app.schemas.call_analysis import (
    AIAnalysisResult,
    AnalysisOut,
    BuyingSignal,
    FollowUpEmail,
    Objection,
    ScoreBreakdown,
)
from app.services.sales_analyzer import SalesAnalyzer
from app.services.transcription import TranscriptionService

router = APIRouter(prefix="/calls", tags=["calls"])


@router.post("/upload-url", response_model=UploadUrlResponse)
def get_upload_url(file_name: str, file_type: str):
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
    
    service = TranscriptionService()
    s3_uri = f"s3://{service.bucket}/{s3_key}"
    job_name = f"transcribe-{call_id}-{uuid.uuid4().hex[:8]}"
    
    service.start_transcription_job(s3_uri, job_name)
    
    call.audio_s3_key = s3_key
    call.transcription_job_id = job_name
    db.commit()
    db.refresh(call)
    return call


@router.get("/{call_id}/transcribe/status")
def get_transcription_status(call_id: str, db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call or not call.transcription_job_id:
        raise HTTPException(404, "Transcription job not found for this call")
    
    service = TranscriptionService()
    job = service.get_job_status(call.transcription_job_id)
    status = job["TranscriptionJobStatus"]
    
    if status == "COMPLETED":
        transcript = service.get_transcript_text(call.transcription_job_id)
        call.transcript = transcript
        db.commit()
    
    return {"status": status, "job_name": call.transcription_job_id}


@router.post("", response_model=CallOut)
def create_call(body: CallCreate, db: Session = Depends(get_db)):
    call = Call(**body.model_dump())
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
    result = CallWithAnalysis.model_validate(call)
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
        db.delete(existing)
        db.commit()

    analyzer = SalesAnalyzer()
    result: AIAnalysisResult = analyzer.analyze(call.transcript)

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
        coaching_drill=result.coaching_drill,
        follow_up_sms=result.follow_up_sms,
        follow_up_email_subject=result.follow_up_email.subject,
        follow_up_email_body=result.follow_up_email.body,
        raw_ai_json=result.model_dump(),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return _analysis_to_out(analysis)


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
        coaching_drill=a.coaching_drill,
        follow_up_sms=a.follow_up_sms,
        follow_up_email=email,
        raw_ai_json=json.dumps(a.raw_ai_json) if a.raw_ai_json else None,
        created_at=a.created_at,
    )



