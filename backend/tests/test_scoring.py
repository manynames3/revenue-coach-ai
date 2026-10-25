from copy import deepcopy
import json
from io import BytesIO

import pytest
from pydantic import ValidationError

from app.schemas.call_analysis import AIAnalysisResult
from app.services.sales_analyzer import AnalysisError, verify_result
from app.services.transcript import parse_transcript
from app.services.transcription import TranscriptionService

RUBRIC = {"score_categories": [
    {"key": "discovery", "weight": 10},
    {"key": "decision", "weight": 30},
    {"key": "budget", "weight": 60},
]}
SEGMENTS = parse_transcript("[00:12] Buyer: We lose ten hours per customer.\n[01:20] Rep: Who needs to approve this?")


def result():
    return AIAnalysisResult(summary="Discovery uncovered a business cost.",
                            scores={"discovery": 20, "decision": 80, "budget": None},
                            score_reasons={"discovery": "Named a cost.", "decision": "Asked about approval.", "budget": "Not discussed."},
                            evidence=[{"score_area": "discovery", "segment_id": "s1", "quote": "We lose ten hours per customer.",
                                       "speaker": "invented", "timestamp": "99:99"},
                                      {"score_area": "decision", "segment_id": "s2", "quote": "Who needs to approve this?"}])


def test_weighted_total_excludes_unobserved_scores_and_metadata_comes_from_source():
    payload = result()
    assert verify_result(payload, SEGMENTS, RUBRIC) == 40
    assert payload.overall_score == 65
    assert payload.evidence[0].speaker == "buyer"
    assert payload.evidence[0].timestamp == "00:12"


@pytest.mark.parametrize("case", ["quote", "segment", "score_range", "nan", "unsupported", "extra_key", "missing_key", "no_reason", "objection", "empty_summary"])
def test_invalid_model_outputs_are_rejected(case):
    payload = result()
    if case == "quote":
        payload.evidence[0].quote = "Invented buyer statement."
    elif case == "segment":
        payload.evidence[0].segment_id = "missing"
    elif case == "score_range":
        payload.scores["discovery"] = 101
    elif case == "nan":
        payload.scores["discovery"] = float("nan")
    elif case == "unsupported":
        payload.evidence = payload.evidence[1:]
    elif case == "extra_key":
        payload.scores["unknown"] = 5
    elif case == "missing_key":
        del payload.scores["budget"]
    elif case == "no_reason":
        payload.score_reasons["decision"] = ""
    elif case == "objection":
        payload.objections = AIAnalysisResult(objections=[{"customer_quote": "I cannot afford it"}]).objections
    elif case == "empty_summary":
        payload.summary = ""
    with pytest.raises(AnalysisError):
        verify_result(payload, SEGMENTS, RUBRIC)


def test_all_unobserved_produces_no_overall_score_not_zero():
    payload = result()
    payload.scores = {key: None for key in payload.scores}
    payload.evidence = []
    assert verify_result(payload, SEGMENTS, RUBRIC) == 0
    assert payload.overall_score is None


def test_redaction_preserves_valid_rubric_keys_but_masks_text():
    from app.services.privacy import redact
    key = "discovery_1234567890123456"
    payload = redact({"key": key, "score_area": key, "quote": "Card 4242 4242 4242 4242 and buyer@example.com"})
    assert payload["key"] == payload["score_area"] == key
    assert "4242" not in payload["quote"] and "buyer@example.com" not in payload["quote"]


def test_framework_versions_validation_and_custom_categories(manager_client):
    original = manager_client.get("/account").json()
    framework = {"name": "Decision rubric", "description": "Approval clarity.",
                 "principles": ["Ask before assuming."],
                 "score_categories": [{"key": "stakeholder_clarity", "label": "Stakeholder clarity", "weight": 25,
                                       "low_anchor": "Approval path unknown.", "high_anchor": "Named approver and agreed next step."}]}
    change = manager_client.patch("/account", json={"coaching_framework": framework})
    assert change.status_code == 200
    version = change.json()["framework_version"]
    assert version == original["framework_version"] + 1
    assert manager_client.patch("/account", json={"coaching_framework": framework}).json()["framework_version"] == version
    sample = manager_client.post("/onboarding/sample").json()["call_id"]
    analysis = manager_client.get(f"/calls/{sample}").json()["analysis"]
    assert analysis["scores"] == {"stakeholder_clarity": None}
    assert analysis["overall_score"] is None
    assert analysis["rubric_snapshot"]["version"] == version
    invalid = deepcopy(framework)
    invalid["score_categories"].append(invalid["score_categories"][0])
    assert manager_client.patch("/account", json={"coaching_framework": invalid}).status_code == 422
    invalid["score_categories"] = [{"key": "invalid key!", "label": "No", "weight": 1}]
    assert manager_client.patch("/account", json={"coaching_framework": invalid}).status_code == 422


def test_asr_word_timing_and_speaker_labels_are_preserved():
    data = {"results": {
        "speaker_labels": {"segments": [{"speaker_label": "spk_0", "items": [{"start_time": "1.2"}, {"start_time": "1.5"}]},
                                        {"speaker_label": "spk_1", "items": [{"start_time": "2.0"}]}]},
        "items": [
            {"type": "pronunciation", "start_time": "1.2", "end_time": "1.4", "alternatives": [{"content": "Hello"}]},
            {"type": "pronunciation", "start_time": "1.5", "end_time": "1.8", "alternatives": [{"content": "there"}]},
            {"type": "punctuation", "alternatives": [{"content": "."}]},
            {"type": "pronunciation", "start_time": "2.0", "end_time": "2.4", "alternatives": [{"content": "Hi"}]},
        ]}}
    service = object.__new__(TranscriptionService)
    service.bucket = "test"
    class FakeS3:
        def get_object(self, **kwargs):
            return {"Body": BytesIO(json.dumps(data).encode())}
    service.s3 = FakeS3()
    segments = service.get_transcript_segments("test-job")
    assert segments[0] == {"id": "s1", "speaker": "spk_0", "text": "Hello there.", "start_seconds": 1.2, "end_seconds": 1.8}
    assert segments[1]["speaker"] == "spk_1"
    assert segments[1]["start_seconds"] == 2.0


@pytest.mark.parametrize("message,allowed", [
    ("The requested job couldn't be found.", True),
    ("Job is in a non-terminal state: IN PROGRESS.", False),
    ("Request did not pass validation.", False),
])
def test_audio_cleanup_only_ignores_a_genuinely_missing_job(message, allowed):
    from botocore.exceptions import ClientError
    service = object.__new__(TranscriptionService)
    service.bucket = "test"
    deleted = []
    class FakeS3:
        def delete_object(self, **kwargs):
            deleted.append(kwargs["Key"])
    class FakeTranscribe:
        def delete_transcription_job(self, **kwargs):
            raise ClientError({"Error": {"Code": "BadRequestException", "Message": message}}, "DeleteTranscriptionJob")
    service.s3, service.transcribe = FakeS3(), FakeTranscribe()
    if allowed:
        service.delete_call_artifacts("uploads/audio.mp3", "job-id")
        assert deleted == ["transcripts/job-id.json", "uploads/audio.mp3"]
    else:
        with pytest.raises(ClientError):
            service.delete_call_artifacts("uploads/audio.mp3", "job-id")
        assert deleted == []
