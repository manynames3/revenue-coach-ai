import secrets
from datetime import timedelta

from sqlalchemy import or_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.coaching_framework import normalize_coaching_framework
from app.config import settings
from app.database import engine
from app.models.call import Call
from app.models.call_analysis import CallAnalysis
from app.models.organization import Organization
from app.models.workspace import AnalysisJob
from app.security import audit, utcnow
from app.services.privacy import redact
from app.services.sales_analyzer import AnalysisError, SalesAnalyzer, verify_result
from app.services.transcript import parse_transcript


def snapshot_for(org):
    snapshot = normalize_coaching_framework(org.coaching_framework)
    return {**snapshot, "version": org.framework_version, "offer_context": org.offer_context or {}}


def persist_analysis(db, call, result, snapshot, source_mode):
    coverage = verify_result(result, call.transcript_segments or parse_transcript(call.transcript), snapshot)
    payload = result.model_dump()
    analysis = CallAnalysis(
        call_id=call.id, overall_score=result.overall_score, summary=result.summary, scores=result.scores,
        score_reasons=result.score_reasons, evidence_coverage=coverage, rubric_snapshot=snapshot,
        source_mode=source_mode, model_name=None if source_mode == "sample" else settings.zai_model,
        strengths=result.strengths, missed_opportunities=result.missed_opportunities,
        objections=payload["objections"], buying_signals=payload["buying_signals"], evidence=payload["evidence"],
        manager_notes=result.manager_notes, sales_psychology=payload["sales_psychology"],
        coaching_drill=result.coaching_drill, follow_up_sms=result.follow_up_sms,
        follow_up_email_subject=result.follow_up_email.subject, follow_up_email_body=result.follow_up_email.body,
        raw_ai_json=payload,
    )
    db.add(analysis)
    call.status = "analyzed"
    call.failure_reason = None
    call.analyzed_at = utcnow()
    return analysis


def process_once():
    now = utcnow()
    lease = secrets.token_urlsafe(16)
    with Session(engine) as db:
        eligible = or_(AnalysisJob.state == "queued",
                       (AnalysisJob.state == "running") & (AnalysisJob.lease_until < now))
        job = db.query(AnalysisJob).filter(eligible, AnalysisJob.attempts < 3).order_by(AnalysisJob.created_at).first()
        if not job:
            return False
        claimed = db.execute(update(AnalysisJob).where(AnalysisJob.id == job.id, eligible)
                             .values(state="running", lease_token=lease, lease_until=now + timedelta(minutes=5),
                                     attempts=AnalysisJob.attempts + 1)
                             .execution_options(synchronize_session=False)).rowcount
        if not claimed:
            db.rollback()
            return False
        db.commit()
        call = db.get(Call, job.call_id)
        if not call:
            return False
        job_id, call_id = job.id, call.id
        transcript, segments, snapshot, is_sample = call.transcript, call.transcript_segments, job.rubric_snapshot, call.is_sample
        org = db.get(Organization, call.organization_id)
        missing_consent = org.recording_consent_required and not call.consent_confirmed
        processing_disabled = not is_sample and not org.processing_enabled
    result = None
    error = None
    try:
        if missing_consent:
            raise AnalysisError("Record permission to process this conversation before retrying analysis.")
        if processing_disabled:
            raise AnalysisError("Real call processing was disabled. Contact your workspace operator before retrying.")
        result = SalesAnalyzer().analyze(transcript, snapshot, segments, snapshot.get("offer_context"), is_sample)
    except AnalysisError as exc:
        error = str(exc)
    except Exception:
        error = "Scoring could not finish. Your call is saved; retry analysis."
    with Session(engine) as db:
        job = db.get(AnalysisJob, job_id)
        call = db.get(Call, call_id)
        if not job or not call or job.lease_token != lease:
            return True
        org = db.get(Organization, call.organization_id)
        if result and org.pii_redaction_enabled:
            result = type(result).model_validate(redact(result.model_dump()))
        if result:
            try:
                if not call.analysis:
                    persist_analysis(db, call, result, snapshot, "sample" if is_sample else "model")
                job.state = "done"
                audit(db, None, "analysis_completed", {"call_id": call_id, "rubric_version": snapshot["version"]}, org.id)
            except AnalysisError as exc:
                error = str(exc)
        if error:
            job.state = "failed"
            job.error = error
            call.status = "failed"
            call.failure_reason = error
            audit(db, None, "analysis_failed", {"call_id": call_id}, org.id)
        job.lease_until = None
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            job = db.get(AnalysisJob, job_id)
            call = db.get(Call, call_id)
            if job and call and job.lease_token == lease:
                if call.analysis:
                    job.state, call.status = "done", "analyzed"
                else:
                    job.state, call.status = "failed", "failed"
                    job.error = call.failure_reason = "The scorecard could not be saved. Retry analysis."
                job.lease_until = None
                db.commit()
    return True


def recover_exhausted_jobs(db):
    for job in db.query(AnalysisJob).filter(AnalysisJob.state == "running", AnalysisJob.lease_until < utcnow(),
                                            AnalysisJob.attempts >= 3).all():
        job.state = "failed"
        job.error = "The scoring worker was interrupted. Retry analysis."
        if call := db.get(Call, job.call_id):
            call.status = "failed"
            call.failure_reason = job.error
    db.commit()
