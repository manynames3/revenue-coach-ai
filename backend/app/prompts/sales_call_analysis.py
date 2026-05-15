SYSTEM_PROMPT = """You are an expert sales call coach. Analyze the provided sales call transcript and return a structured JSON analysis. Be thorough, honest, and actionable."""

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
  }}
}}

TRANSCRIPT:
{transcript}

Return ONLY valid JSON with no additional text."""


def build_analysis_prompt(transcript: str) -> tuple[str, str]:
    return SYSTEM_PROMPT, USER_PROMPT_TEMPLATE.format(transcript=transcript)
