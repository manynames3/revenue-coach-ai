import json
import logging

from app.config import settings
from app.prompts.sales_call_analysis import build_analysis_prompt
from app.schemas.call_analysis import AIAnalysisResult
from app.services.glm_client import GLMClient

logger = logging.getLogger(__name__)


class SalesAnalyzer:
    def __init__(self):
        self.glm = GLMClient() if not settings.mock_ai else None

    def analyze(self, transcript: str) -> AIAnalysisResult:
        if settings.mock_ai or not settings.zai_api_key:
            return self._mock_result()

        system, user = build_analysis_prompt(transcript)
        try:
            raw = self.glm.chat(system, user)
            return self._parse(raw)
        except Exception as e:
            logger.warning(f"GLM API call failed, falling back to mock: {e}")
            return self._mock_result()

    def _parse(self, raw: str) -> AIAnalysisResult:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()
        data = json.loads(cleaned)
        return AIAnalysisResult(**data)

    def _mock_result(self) -> AIAnalysisResult:
        return AIAnalysisResult(
            overall_score=72,
            summary="The rep built good rapport but missed key discovery questions. Objections around pricing were handled adequately but could be stronger.",
            scores={"rapport": 80, "discovery": 55, "objection_handling": 65, "closing": 70, "follow_up": 90},
            strengths=["Good opening rapport", "Asked about customer's timeline", "Offered a relevant case study"],
            missed_opportunities=["Did not qualify budget early", "Missed opportunity to handle price objection with value narrative", "Could have asked for referral"],
            objections=[
                {
                    "type": "pricing",
                    "customer_quote": "That's way more than I was expecting.",
                    "rep_response_quality": "average",
                    "better_response": "I understand the sticker shock. Before we look at numbers, can I ask what solving this would be worth if it fixed the rollout delays you mentioned?"
                }
            ],
            buying_signals=[
                {
                    "signal": "Customer asked about implementation timeline",
                    "strength": "strong",
                    "why_it_matters": "Asking about next steps indicates purchase intent"
                }
            ],
            manager_notes=["Focus on discovery questions early", "Practice value-based pricing rebuttal"],
            coaching_drill="Role-play the first 5 minutes with a buyer who leads with pricing concerns. The rep must ask three problem and consequence questions before presenting.",
            follow_up_sms="Hi [Name], thanks for your time today. I'll send over the proposal by tomorrow. Let me know if any questions come up in the meantime. - [Rep Name]",
            follow_up_email={
                "subject": "Following up on our conversation",
                "body": "Hi [Name],\n\nThanks again for the great conversation today. As promised, here's a summary of what we discussed:\n\n[Summary]\n\nI'm confident we can deliver the results you're looking for. Let me know if you'd like to schedule a follow-up call.\n\nBest,\n[Rep Name]"
            },
            sales_psychology={
                "trust_level": "medium",
                "pain_depth": "moderate",
                "urgency_level": "medium",
                "decision_clarity": "partial",
                "money_readiness": "medium",
                "resistance_created": "medium",
                "close_probability": "medium",
                "emotional_driver": "The buyer wants confidence that implementation will be fast enough to justify the investment.",
                "primary_blocker": "Pricing concern was raised before the buyer fully connected cost to business impact.",
                "scores": {
                    "trust_and_safety": 78,
                    "problem_clarity": 62,
                    "emotional_depth": 54,
                    "consequence_awareness": 48,
                    "decision_clarity": 58,
                    "money_readiness": 60,
                    "urgency": 64,
                    "resistance_management": 57,
                },
                "better_questions": [
                    {
                        "category": "problem",
                        "missed_moment": "The buyer mentioned rollout timing, but the rep moved quickly toward the proposal.",
                        "suggested_question": "What happens on your side if this rollout is still unresolved 90 days from now?",
                        "why_it_works": "It helps the buyer verbalize consequence instead of forcing the rep to argue for urgency.",
                    },
                    {
                        "category": "money",
                        "missed_moment": "The price objection was met with ROI explanation before the buyer's concern was clarified.",
                        "suggested_question": "When you say it is more than expected, is the concern cash flow, confidence in the outcome, or comparing us to another option?",
                        "why_it_works": "It separates financial ability from trust and comparison concerns, which need different responses.",
                    },
                    {
                        "category": "decision",
                        "missed_moment": "The rep did not confirm who else influences the final decision.",
                        "suggested_question": "Besides you, who would need to feel comfortable before moving forward?",
                        "why_it_works": "It surfaces stakeholder risk before it becomes a late-stage objection.",
                    },
                ],
                "objection_psychology": [
                    {
                        "objection_type": "pricing",
                        "buyer_language": "That's way more than I was expecting.",
                        "underlying_concern": "The buyer has not fully connected the investment to the cost of staying with the current problem.",
                        "recommended_question": "What were you expecting to invest, and what outcome did you have attached to that number?",
                    }
                ],
                "next_call_strategy": "Slow down discovery, deepen consequence questions, and clarify decision stakeholders before presenting investment or ROI.",
            },
        )
