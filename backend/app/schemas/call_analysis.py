from datetime import datetime

from pydantic import BaseModel


class ScoreBreakdown(BaseModel):
    rapport: float = 0
    discovery: float = 0
    objection_handling: float = 0
    closing: float = 0
    follow_up: float = 0


class Objection(BaseModel):
    type: str = ""
    customer_quote: str = ""
    rep_response_quality: str = ""
    better_response: str = ""


class BuyingSignal(BaseModel):
    signal: str = ""
    strength: str = ""
    why_it_matters: str = ""


class FollowUpEmail(BaseModel):
    subject: str = ""
    body: str = ""


class AIAnalysisResult(BaseModel):
    overall_score: float = 0
    summary: str = ""
    scores: ScoreBreakdown = ScoreBreakdown()
    strengths: list[str] = []
    missed_opportunities: list[str] = []
    objections: list[Objection] = []
    buying_signals: list[BuyingSignal] = []
    manager_notes: list[str] = []
    coaching_drill: str = ""
    follow_up_sms: str = ""
    follow_up_email: FollowUpEmail = FollowUpEmail()


class AnalysisOut(BaseModel):
    id: str
    call_id: str
    overall_score: float | None = None
    summary: str | None = None
    scores: ScoreBreakdown | None = None
    strengths: list[str] = []
    missed_opportunities: list[str] = []
    objections: list[Objection] = []
    buying_signals: list[BuyingSignal] = []
    manager_notes: list[str] = []
    coaching_drill: str | None = None
    follow_up_sms: str | None = None
    follow_up_email: FollowUpEmail | None = None
    raw_ai_json: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}



