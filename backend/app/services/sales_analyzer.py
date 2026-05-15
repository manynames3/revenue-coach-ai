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
            strengths=["Good开场 rapport building", "Asked about customer's timeline", "Offered a relevant case study"],
            missed_opportunities=["Did not qualify budget early", "Missed opportunity to handle price objection with value narrative", "Could have asked for referral"],
            objections=[
                {
                    "type": "pricing",
                    "customer_quote": "That's way more than I was expecting.",
                    "rep_response_quality": "average",
                    "better_response": "I understand the sticker shock. Let me break down the ROI — most of our clients see a full return within 90 days."
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
            coaching_drill="Role-play the first 5 minutes with a mock customer who leads with pricing concerns.",
            follow_up_sms="Hi [Name], thanks for your time today! I'll send over the proposal by tomorrow. Let me know if any questions come up in the meantime. — [Rep Name]",
            follow_up_email={
                "subject": "Following up on our conversation",
                "body": "Hi [Name],\n\nThanks again for the great conversation today. As promised, here's a summary of what we discussed:\n\n[Summary]\n\nI'm confident we can deliver the results you're looking for. Let me know if you'd like to schedule a follow-up call.\n\nBest,\n[Rep Name]"
            },
        )
