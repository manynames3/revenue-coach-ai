SYSTEM_PROMPT = """You are an expert sales call coach for high-ticket consultative sales teams. Analyze the provided sales call transcript and return a structured JSON analysis. Be thorough, honest, and actionable.

Use buyer-centered, question-led sales psychology principles. Do not copy or claim any proprietary methodology. Focus on whether the rep reduced resistance, helped the buyer self-diagnose the problem, uncovered emotional motivation, clarified consequence of inaction, understood decision criteria, and handled money or stakeholder concerns without becoming pushy."""

USER_PROMPT_TEMPLATE = """Analyze this sales call transcript and return a JSON object with this exact structure:

{{
  "overall_score": <0-100>,
  "summary": "<2-3 sentence summary>",
  "scores": {{
    "rapport": <0-100>,
    "discovery": <0-100>,
    "objection_handling": <0-100>,
    "closing": <0-100>,
    "follow_up": <0-100>
  }},
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "missed_opportunities": ["<opportunity 1>", "<opportunity 2>", ...],
  "objections": [
    {{
      "type": "<objection category>",
      "customer_quote": "<exact quote>",
      "rep_response_quality": "<good|average|poor>",
      "better_response": "<improved response>"
    }}
  ],
  "buying_signals": [
    {{
      "signal": "<what the customer said>",
      "strength": "<strong|medium|weak>",
      "why_it_matters": "<why this signal matters>"
    }}
  ],
  "manager_notes": ["<note 1>", "<note 2>", ...],
  "coaching_drill": "<one specific drill to improve>",
  "follow_up_sms": "<follow-up SMS text message>",
  "follow_up_email": {{
    "subject": "<email subject>",
    "body": "<email body>"
  }},
  "sales_psychology": {{
    "trust_level": "<low|medium|high>",
    "pain_depth": "<surface|moderate|deep>",
    "urgency_level": "<low|medium|high>",
    "decision_clarity": "<unclear|partial|clear>",
    "money_readiness": "<low|medium|high>",
    "resistance_created": "<low|medium|high>",
    "close_probability": "<low|medium|high>",
    "emotional_driver": "<primary emotional motivation or empty string>",
    "primary_blocker": "<main psychological, financial, timing, or stakeholder blocker>",
    "scores": {{
      "trust_and_safety": <0-100>,
      "problem_clarity": <0-100>,
      "emotional_depth": <0-100>,
      "consequence_awareness": <0-100>,
      "decision_clarity": <0-100>,
      "money_readiness": <0-100>,
      "urgency": <0-100>,
      "resistance_management": <0-100>
    }},
    "better_questions": [
      {{
        "category": "<connection|problem|consequence|desire|money|decision|commitment>",
        "missed_moment": "<what the rep missed or rushed>",
        "suggested_question": "<one better question the rep could ask>",
        "why_it_works": "<why this question lowers resistance or improves discovery>"
      }}
    ],
    "objection_psychology": [
      {{
        "objection_type": "<pricing|timing|spouse_partner|trust|comparison|send_info|other>",
        "buyer_language": "<exact or close buyer language>",
        "underlying_concern": "<what is likely underneath the objection>",
        "recommended_question": "<question-led response that explores the concern>"
      }}
    ],
    "next_call_strategy": "<specific strategy for the next call or coaching session>"
  }}
}}

TRANSCRIPT:
{transcript}

Return ONLY valid JSON with no additional text."""


def build_analysis_prompt(transcript: str) -> tuple[str, str]:
    return SYSTEM_PROMPT, USER_PROMPT_TEMPLATE.format(transcript=transcript)
