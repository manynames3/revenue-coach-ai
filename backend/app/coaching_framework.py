from copy import deepcopy
from typing import Any


DEFAULT_COACHING_FRAMEWORK: dict[str, Any] = {
    "name": "High-ticket revenue psychology",
    "description": (
        "Question-led coaching for consultative sales teams that need deeper discovery, "
        "cleaner objections, and clearer next-step commitment."
    ),
    "principles": [
        "Do not pitch before the buyer has named the cost of staying the same.",
        "Use questions to lower resistance instead of arguing through objections.",
        "Separate money, trust, timing, and decision concerns before responding.",
        "Coach toward the next buyer commitment, not just a better call score.",
    ],
    "score_categories": [
        {
            "key": "trust_and_safety",
            "label": "Trust and safety",
            "description": "Buyer feels understood enough to share the real concern.",
            "weight": 15,
            "low_anchor": "The rep assumes the concern, interrupts, or moves to the offer without checking understanding.",
            "high_anchor": "The rep uses neutral questions and checks understanding of the buyer's stated concern.",
        },
        {
            "key": "problem_clarity",
            "label": "Problem clarity",
            "description": "The rep helps the buyer define the problem in their own words.",
            "weight": 15,
            "low_anchor": "The conversation stays at a surface symptom or the rep pitches before defining the problem.",
            "high_anchor": "The buyer names the concrete problem, its current baseline, and who is affected.",
        },
        {
            "key": "consequence_awareness",
            "label": "Consequence awareness",
            "description": "The buyer connects delay or inaction to business and personal cost.",
            "weight": 20,
            "low_anchor": "The cost of staying the same is not explored, or the rep supplies unsupported pressure.",
            "high_anchor": "The buyer explains a concrete business or personal consequence in their own words.",
        },
        {
            "key": "money_readiness",
            "label": "Money readiness",
            "description": "The investment conversation is tied to value, risk, and decision logic.",
            "weight": 15,
            "low_anchor": "The rep assumes affordability or offers a discount before clarifying the investment concern.",
            "high_anchor": "The investment concern, value, and constraints are explored without assuming a budget.",
        },
        {
            "key": "decision_clarity",
            "label": "Decision clarity",
            "description": "Stakeholders, approval path, timing, and next steps are explicit.",
            "weight": 20,
            "low_anchor": "Approvers, evaluation criteria, or the buyer's next step remain unclear.",
            "high_anchor": "The approver, evaluation criteria, and a mutually agreed next step with timing are explicit.",
        },
        {
            "key": "resistance_management",
            "label": "Resistance management",
            "description": "Objections are explored before the rep explains or defends.",
            "weight": 15,
            "low_anchor": "The rep argues, defends the offer, or offers flexibility before clarifying the objection.",
            "high_anchor": "The rep checks understanding and asks a neutral question before responding to the concern.",
        },
    ],
}


def default_coaching_framework() -> dict[str, Any]:
    return deepcopy(DEFAULT_COACHING_FRAMEWORK)


def normalize_coaching_framework(value: dict[str, Any] | None) -> dict[str, Any]:
    from app.schemas.account import CoachingFramework
    return CoachingFramework.model_validate(value or default_coaching_framework()).model_dump()
