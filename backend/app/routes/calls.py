import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.call import Call
from app.models.call_analysis import CallAnalysis
from app.schemas.call import CallCreate, CallOut, CallWithAnalysis
from app.schemas.call_analysis import (
    AIAnalysisResult,
    AnalysisOut,
    BuyingSignal,
    FollowUpEmail,
    Objection,
    ScoreBreakdown,
)
from app.services.sales_analyzer import SalesAnalyzer

router = APIRouter(prefix="/calls", tags=["calls"])


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
        scores_json=result.scores.model_dump_json(),
        strengths_json=json.dumps(result.strengths),
        missed_opportunities_json=json.dumps(result.missed_opportunities),
        objections_json=json.dumps([o.model_dump() for o in result.objections]),
        buying_signals_json=json.dumps([b.model_dump() for b in result.buying_signals]),
        manager_notes_json=json.dumps(result.manager_notes),
        coaching_drill=result.coaching_drill,
        follow_up_sms=result.follow_up_sms,
        follow_up_email_subject=result.follow_up_email.subject,
        follow_up_email_body=result.follow_up_email.body,
        raw_ai_json=result.model_dump_json(),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return _analysis_to_out(analysis)


def _analysis_to_out(a: CallAnalysis) -> AnalysisOut:
    scores = ScoreBreakdown(**json.loads(a.scores_json)) if a.scores_json else None
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
        strengths=json.loads(a.strengths_json) if a.strengths_json else [],
        missed_opportunities=json.loads(a.missed_opportunities_json) if a.missed_opportunities_json else [],
        objections=[Objection(**o) for o in json.loads(a.objections_json)] if a.objections_json else [],
        buying_signals=[BuyingSignal(**b) for b in json.loads(a.buying_signals_json)] if a.buying_signals_json else [],
        manager_notes=json.loads(a.manager_notes_json) if a.manager_notes_json else [],
        coaching_drill=a.coaching_drill,
        follow_up_sms=a.follow_up_sms,
        follow_up_email=email,
        raw_ai_json=a.raw_ai_json,
        created_at=a.created_at,
    )



