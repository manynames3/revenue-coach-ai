from app.evaluation import evaluate, read_jsonl
from test_scoring import RUBRIC, SEGMENTS, result


def case():
    return {"id": "synthetic-test", "rubric": {"name": "Evaluation rubric", "score_categories": [
                {"key": row["key"], "label": row["key"], "weight": row["weight"]} for row in RUBRIC["score_categories"]]},
            "segments": SEGMENTS, "expected_scores": {"discovery": 30, "decision": 70, "budget": None}}


def test_evaluation_measures_error_without_calling_a_provider():
    report = evaluate([case()], [{"id": "synthetic-test", "output": result().model_dump()}])
    assert report["accepted"] == 1
    assert report["category_mae"] == 10
    assert report["observation_agreement_percent"] == 100
    assert report["average_observed_coverage_percent"] == 40


def test_evaluation_reports_missing_and_ungrounded_outputs():
    missing = evaluate([case()], [])
    assert missing["category_mae"] is None
    assert missing["results"][0]["state"] == "missing"
    output = result()
    output.evidence[0].quote = "An invented quote."
    invalid = evaluate([case()], [{"id": "synthetic-test", "output": output.model_dump()}])
    assert invalid["accepted"] == 0
    assert invalid["results"][0]["state"] == "rejected"
