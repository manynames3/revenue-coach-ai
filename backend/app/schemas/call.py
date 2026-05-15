from datetime import datetime

from pydantic import BaseModel

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
    created_at: datetime

    model_config = {"from_attributes": True}


class CallWithAnalysis(CallOut):
    analysis: AnalysisOut | None = None
