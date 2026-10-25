import json
import logging
import math

from app.coaching_framework import normalize_coaching_framework
from app.config import settings
from app.prompts.grounded_analysis import build_analysis_prompt
from app.sample_call import SAMPLE_SCORES
from app.schemas.call_analysis import AIAnalysisResult
from app.services.glm_client import GLMClient
from app.services.transcript import format_timestamp, parse_transcript

logger = logging.getLogger(__name__)


class AnalysisError(Exception):
    pass


def verify_result(result: AIAnalysisResult, segments: list[dict], framework: dict):
    weights = {category["key"]: category["weight"] for category in framework["score_categories"]}
    if set(result.scores) != set(weights):
        raise AnalysisError("The scorecard did not follow the saved rubric. Retry analysis.")
    by_id = {segment["id"]: segment for segment in segments}
    supported = set()
    for item in result.evidence:
        segment = by_id.get(item.segment_id)
        if not segment or not item.quote.strip() or item.quote not in segment["text"] or item.score_area not in weights:
            raise AnalysisError("A coaching excerpt could not be verified against the transcript. Retry analysis.")
        item.speaker = segment["speaker"]
        item.timestamp = format_timestamp(segment.get("start_seconds"))
        supported.add(item.score_area)
    total = 0.0
    observed_weight = 0
    for key, value in result.scores.items():
        if not result.score_reasons.get(key, "").strip():
            raise AnalysisError("A scoring rationale is missing. Retry analysis.")
        if value is None:
            continue
        if not math.isfinite(value) or not 0 <= value <= 100 or key not in supported:
            raise AnalysisError("A score is invalid or lacks transcript evidence. Retry analysis.")
        total += weights[key] * value
        observed_weight += weights[key]
    for objection in result.objections:
        if objection.customer_quote and not any(objection.customer_quote in segment["text"] for segment in segments):
            raise AnalysisError("An objection quote could not be verified. Retry analysis.")
    if not result.summary.strip():
        raise AnalysisError("The scorecard is incomplete. Retry analysis.")
    result.overall_score = round(total / observed_weight, 1) if observed_weight else None
    result.sales_psychology.close_probability = ""
    return round(observed_weight / sum(weights.values()) * 100, 1)


class SalesAnalyzer:
    def analyze(self, transcript: str, coaching_framework: dict | None = None,
                segments: list[dict] | None = None, context: dict | None = None, is_sample: bool = False):
        framework = normalize_coaching_framework(coaching_framework)
        segments = segments or parse_transcript(transcript)
        if is_sample:
            result = self._sample_result(framework)
        else:
            if settings.mock_ai or not settings.zai_api_key:
                raise AnalysisError("Real call scoring is unavailable. Configure the model provider or use the labeled sample.")
            try:
                system, user = build_analysis_prompt(segments, framework, context or {})
                result = self._parse(GLMClient().chat(system, user))
            except Exception as exc:
                logger.warning("Analysis provider failed (%s)", type(exc).__name__)
                raise AnalysisError("AI scoring failed. Your call was saved; retry analysis.") from exc
        verify_result(result, segments, framework)
        return result

    def _parse(self, raw: str):
        cleaned = raw.strip()
        if cleaned.startswith("\u0060\u0060\u0060"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("\u0060\u0060\u0060", 1)[0]
        return AIAnalysisResult.model_validate(json.loads(cleaned.strip()))

    def _sample_result(self, framework):
        scores = {}
        reasons = {}
        evidence = []
        for category in framework["score_categories"]:
            key = category["key"]
            annotated = SAMPLE_SCORES.get(key)
            scores[key] = annotated[0] if annotated else None
            reasons[key] = annotated[3] if annotated else "This illustrative sample has no annotation for this category."
            if annotated:
                evidence.append({"score_area": key, "segment_id": annotated[1], "quote": annotated[2],
                                 "category": "strength" if annotated[0] >= 65 else "risk",
                                 "coaching_point": annotated[3]})
        return AIAnalysisResult(
            summary="Illustrative sample: discovery exposes a concrete business cost. The rep offers pricing flexibility before clarifying the concern and leaves the approval path vague.",
            scores=scores, score_reasons=reasons, evidence=evidence,
            strengths=["Open discovery question", "Consequence question uncovered time lost"],
            missed_opportunities=["Clarify the price concern before discussing flexibility", "Agree on the partner's approval criteria and next step"],
            manager_notes=["Rehearse two clarifying questions before addressing a pricing objection"],
            coaching_drill="Replay the price objection. Ask what is behind the concern, then clarify the decision criteria before offering flexibility.",
            follow_up_sms="Thanks for discussing onboarding. You mentioned losing ten hours per customer. What would your partner need to evaluate a change?",
            follow_up_email={"subject": "Your onboarding goals and approval process",
                             "body": "You described a six-week onboarding process and ten hours lost per customer. What would your partner need to evaluate an improvement? Let's agree on a next step after clarifying that."},
            sales_psychology={"primary_blocker": "Approval criteria and the reason for the price concern are unresolved.",
                              "next_call_strategy": "Clarify the investment concern and partner's decision criteria.",
                              "better_questions": [{"category": "money", "missed_moment": "The buyer raised price before the rep clarified the concern.",
                                                    "suggested_question": "What concerns you most about the investment?",
                                                    "why_it_works": "It invites the buyer to identify the concern instead of assuming it is price alone."}]},
        )
