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
        },
        {
            "key": "problem_clarity",
            "label": "Problem clarity",
            "description": "The rep helps the buyer define the problem in their own words.",
            "weight": 15,
        },
        {
            "key": "consequence_awareness",
            "label": "Consequence awareness",
            "description": "The buyer connects delay or inaction to business and personal cost.",
            "weight": 20,
        },
        {
            "key": "money_readiness",
            "label": "Money readiness",
            "description": "The investment conversation is tied to value, risk, and decision logic.",
            "weight": 15,
        },
        {
            "key": "decision_clarity",
            "label": "Decision clarity",
            "description": "Stakeholders, approval path, timing, and next steps are explicit.",
            "weight": 20,
        },
        {
            "key": "resistance_management",
            "label": "Resistance management",
            "description": "Objections are explored before the rep explains or defends.",
            "weight": 15,
        },
    ],
}


def default_coaching_framework() -> dict[str, Any]:
    return deepcopy(DEFAULT_COACHING_FRAMEWORK)


def normalize_coaching_framework(value: dict[str, Any] | None) -> dict[str, Any]:
    framework = default_coaching_framework()
    if not value:
        return framework

    for key in ("name", "description"):
        if isinstance(value.get(key), str) and value[key].strip():
            framework[key] = value[key].strip()

    if isinstance(value.get("principles"), list):
        principles = [str(item).strip() for item in value["principles"] if str(item).strip()]
        if principles:
            framework["principles"] = principles[:8]

    if isinstance(value.get("score_categories"), list):
        categories = []
        for item in value["score_categories"]:
            if not isinstance(item, dict):
                continue
            key = str(item.get("key") or "").strip()
            label = str(item.get("label") or "").strip()
            description = str(item.get("description") or "").strip()
            if not key or not label:
                continue
            try:
                weight = int(item.get("weight", 10))
            except (TypeError, ValueError):
                weight = 10
            categories.append(
                {
                    "key": key,
                    "label": label,
                    "description": description,
                    "weight": max(0, min(100, weight)),
                }
            )
        if categories:
            framework["score_categories"] = categories[:10]

    return framework
