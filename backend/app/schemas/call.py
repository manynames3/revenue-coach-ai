from datetime import datetime

from pydantic import BaseModel

from app.call_status import CallStatus
from app.schemas.call_analysis import AnalysisOut


class CallCreate(BaseModel):
    rep_id: str
    organization_id: str = "default"
    lead_name: str | None = None
    lead_source: str | None = None
    call_type: str | None = None
    outcome: str | None = None
    transcript: str | None = None


class CallOut(BaseModel):
    id: str
    rep_id: str
    organization_id: str
    lead_name: str | None = None
    lead_source: str | None = None
    call_type: str | None = None
    outcome: str | None = None
    transcript: str | None = None
    audio_s3_key: str | None = None
    transcription_job_id: str | None = None
    status: CallStatus = CallStatus.CREATED
    failure_reason: str | None = None
    transcription_retry_count: int = 0
    analysis_retry_count: int = 0
    transcription_started_at: datetime | None = None
    transcribed_at: datetime | None = None
    analysis_started_at: datetime | None = None
    analyzed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class UploadUrlResponse(BaseModel):
    url: str
    fields: dict[str, str]
    key: str


class TranscriptionStatusResponse(BaseModel):
    status: str
    call_status: CallStatus
    job_name: str
    failure_reason: str | None = None


class CallWithAnalysis(CallOut):
    analysis: AnalysisOut | None = None
