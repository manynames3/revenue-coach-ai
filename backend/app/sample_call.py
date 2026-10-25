from app.services.transcript import parse_transcript

SAMPLE_TRANSCRIPT = """[00:02] Rep: What brought you to look at improving onboarding now?
[00:12] Buyer: Our onboarding takes six weeks, and customers are frustrated.
[00:24] Rep: What happens if this stays the same for another quarter?
[00:34] Buyer: We lose about ten hours per customer, and my team is burning out.
[00:51] Buyer: The price is more than I expected.
[01:03] Rep: We can be flexible on rollout and pricing.
[01:16] Buyer: My partner needs to approve the investment.
[01:28] Rep: I'll send you the details and we can reconnect."""

SAMPLE_SEGMENTS = parse_transcript(SAMPLE_TRANSCRIPT)
SAMPLE_SCORES = {
    "trust_and_safety": (75, "s1", "What brought you to look at improving onboarding now?", "Open question invites the buyer to describe the problem."),
    "problem_clarity": (68, "s2", "Our onboarding takes six weeks, and customers are frustrated.", "The buyer describes a problem; the rep could establish a clearer baseline."),
    "consequence_awareness": (80, "s4", "We lose about ten hours per customer, and my team is burning out.", "The buyer connects the problem to time lost and team impact."),
    "money_readiness": (45, "s5", "The price is more than I expected.", "The investment concern is stated but has not been clarified."),
    "decision_clarity": (35, "s7", "My partner needs to approve the investment.", "A stakeholder is identified, but their criteria and approval path remain unknown."),
    "resistance_management": (30, "s6", "We can be flexible on rollout and pricing.", "The rep offers flexibility before asking what is behind the price concern."),
}
