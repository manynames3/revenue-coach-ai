from datetime import datetime

from pydantic import BaseModel, Field


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


class EvidenceItem(BaseModel):
    category: str = ""
    speaker: str = ""
    quote: str = ""
    timestamp: str = ""
    score_area: str = ""
    coaching_point: str = ""


class FollowUpEmail(BaseModel):
    subject: str = ""
    body: str = ""


class SalesPsychologyScores(BaseModel):
    trust_and_safety: float = 0
    problem_clarity: float = 0
    emotional_depth: float = 0
    consequence_awareness: float = 0
    decision_clarity: float = 0
    money_readiness: float = 0
    urgency: float = 0
    resistance_management: float = 0


class BetterQuestion(BaseModel):
    category: str = ""
    missed_moment: str = ""
    suggested_question: str = ""
    why_it_works: str = ""


class ObjectionPsychology(BaseModel):
    objection_type: str = ""
    buyer_language: str = ""
    underlying_concern: str = ""
    recommended_question: str = ""


class SalesPsychology(BaseModel):
    trust_level: str = ""
    pain_depth: str = ""
    urgency_level: str = ""
    decision_clarity: str = ""
    money_readiness: str = ""
    resistance_created: str = ""
    close_probability: str = ""
    emotional_driver: str = ""
    primary_blocker: str = ""
    scores: SalesPsychologyScores = Field(default_factory=SalesPsychologyScores)
    better_questions: list[BetterQuestion] = Field(default_factory=list)
    objection_psychology: list[ObjectionPsychology] = Field(default_factory=list)
    next_call_strategy: str = ""


class AIAnalysisResult(BaseModel):
    overall_score: float = 0
    summary: str = ""
    scores: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    strengths: list[str] = Field(default_factory=list)
    missed_opportunities: list[str] = Field(default_factory=list)
    objections: list[Objection] = Field(default_factory=list)
    buying_signals: list[BuyingSignal] = Field(default_factory=list)
    manager_notes: list[str] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    coaching_drill: str = ""
    follow_up_sms: str = ""
    follow_up_email: FollowUpEmail = Field(default_factory=FollowUpEmail)
    sales_psychology: SalesPsychology = Field(default_factory=SalesPsychology)


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
    evidence: list[EvidenceItem] = []
    coaching_drill: str | None = None
    follow_up_sms: str | None = None
    follow_up_email: FollowUpEmail | None = None
    sales_psychology: SalesPsychology | None = None
    raw_ai_json: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}

