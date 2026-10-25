from datetime import datetime

from pydantic import BaseModel, Field

from app.call_status import CallStatus
from app.schemas.call_analysis import AnalysisOut


class CallCreate(BaseModel):
    rep_id: str
    organization_id: str | None = None
    lead_name: str | None = Field(default=None, max_length=200)
    lead_source: str | None = Field(default=None, max_length=200)
    call_type: str | None = Field(default=None, max_length=100)
    outcome: str | None = Field(default=None, max_length=1000)
    transcript: str | None = Field(default=None, max_length=80000)
    consent_confirmed: bool = False
    consent_notes: str | None = Field(default=None, max_length=2000)

    model_config = {"extra": "forbid"}


class CallOut(BaseModel):
    id: str
    rep_id: str
    organization_id: str
    lead_name: str | None = None
    lead_source: str | None = None
    call_type: str | None = None
    outcome: str | None = None
    transcript: str | None = None
    transcript_segments: list[dict] | None = None
    is_sample: bool = False
    consent_confirmed: bool = False
    consent_notes: str | None = None
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
