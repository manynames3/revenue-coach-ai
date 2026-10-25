"""Evaluate saved model outputs against consented, human-labeled JSONL cases. No API calls."""
import argparse
import json
import math
from pathlib import Path

from app.coaching_framework import normalize_coaching_framework
from app.schemas.call_analysis import AIAnalysisResult
from app.services.sales_analyzer import verify_result
from app.services.transcript import parse_transcript


def read_jsonl(path):
    rows = [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]
    ids = [row["id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("Case IDs must be unique.")
    return rows


def evaluate(cases, predictions):
    by_id = {row["id"]: row["output"] for row in predictions}
    if set(by_id) - {case["id"] for case in cases}:
        raise ValueError("Predictions contain unknown case IDs.")
    errors = []
    agreements = []
    coverage = []
    results = []
    for case in cases:
        rubric = normalize_coaching_framework(case["rubric"])
        expected = case["expected_scores"]
        keys = {category["key"] for category in rubric["score_categories"]}
        if set(expected) != keys or any(value is not None and (not math.isfinite(value) or not 0 <= value <= 100)
                                        for value in expected.values()):
            raise ValueError("Human labels must include every rubric category and valid scores.")
        if case["id"] not in by_id:
            results.append({"id": case["id"], "state": "missing"})
            continue
        try:
            output = AIAnalysisResult.model_validate(by_id[case["id"]])
            observed_coverage = verify_result(output, case.get("segments") or parse_transcript(case["transcript"]), rubric)
        except Exception as exc:
            results.append({"id": case["id"], "state": "rejected", "reason": type(exc).__name__})
            continue
        coverage.append(observed_coverage)
        case_errors = []
        for key, human in expected.items():
            model = output.scores[key]
            agreements.append((human is None) == (model is None))
            if human is not None and model is not None:
                difference = abs(human - model)
                errors.append(difference)
                case_errors.append(difference)
        results.append({"id": case["id"], "state": "accepted", "coverage_percent": observed_coverage,
                        "category_mae": round(sum(case_errors) / len(case_errors), 2) if case_errors else None})
    count = len(cases)
    return {"cases": count, "accepted": len(coverage),
            "accepted_percent": round(len(coverage) / count * 100, 1) if count else None,
            "category_mae": round(sum(errors) / len(errors), 2) if errors else None,
            "compared_categories": len(errors),
            "observation_agreement_percent": round(sum(agreements) / len(agreements) * 100, 1) if agreements else None,
            "average_observed_coverage_percent": round(sum(coverage) / len(coverage), 1) if coverage else None,
            "results": results}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cases")
    parser.add_argument("predictions")
    args = parser.parse_args()
    print(json.dumps(evaluate(read_jsonl(args.cases), read_jsonl(args.predictions)), indent=2))


if __name__ == "__main__":
    main()
