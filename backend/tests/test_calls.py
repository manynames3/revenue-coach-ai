from datetime import timedelta

import pytest
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine
from app.models.call import Call
from app.models.call_analysis import CallAnalysis
from app.models.workspace import AnalysisJob, AuditEvent, CoachingAssignment
from app.sample_call import SAMPLE_TRANSCRIPT
from app.security import utcnow
from app.services.analysis_jobs import process_once
from app.services.audio_jobs import refresh_transcriptions
from app.services.privacy import purge_expired
from app.services.sales_analyzer import SalesAnalyzer


def create_call(client, rep_id, **changes):
    payload = {"rep_id": rep_id, "lead_name": "Buyer", "transcript": SAMPLE_TRANSCRIPT,
               "consent_confirmed": True, **changes}
    response = client.post("/calls", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_sample_is_labeled_grounded_idempotent_and_excluded_from_real_metrics(manager_client):
    client = manager_client
    first = client.post("/onboarding/sample").json()["call_id"]
    assert client.post("/onboarding/sample").json()["call_id"] == first
    detail = client.get(f"/calls/{first}").json()
    assert detail["is_sample"] is True
    assert detail["analysis"]["source_mode"] == "sample"
    segments = {s["id"]: s for s in detail["transcript_segments"]}
    for evidence in detail["analysis"]["evidence"]:
        assert evidence["quote"] in segments[evidence["segment_id"]]["text"]
        assert evidence["speaker"] == segments[evidence["segment_id"]]["speaker"]
    assert detail["analysis"]["overall_score"] != 72
    assert "raw_ai_json" not in detail["analysis"]
    overview = client.get("/dashboard/overview").json()
    assert overview["analyzed_calls"] == 0
    assert overview["average_score"] is None
    assert overview["recent_scores"][0]["source_mode"] == "sample"


def test_real_scoring_is_not_silently_mocked(manager_client, rep_id):
    call = create_call(manager_client, rep_id)
    response = manager_client.post(f"/calls/{call['id']}/analyze")
    assert response.status_code == 503
    detail = manager_client.get(f"/calls/{call['id']}").json()
    assert detail["analysis"] is None
    assert detail["transcript"] == SAMPLE_TRANSCRIPT
    assert detail["failure_reason"]
    with Session(engine) as db:
        assert db.query(AnalysisJob).count() == 0


def test_jobs_are_idempotent_fail_honestly_then_retry(manager_client, rep_id, monkeypatch):
    monkeypatch.setattr(settings, "mock_ai", False)
    monkeypatch.setattr(settings, "zai_api_key", "test-only-key")
    monkeypatch.setattr("app.services.glm_client.GLMClient.chat",
                        lambda *args: (_ for _ in ()).throw(TimeoutError("provider unavailable")))
    call = create_call(manager_client, rep_id)
    path = f"/calls/{call['id']}/analyze"
    first = manager_client.post(path)
    assert first.status_code == 202
    assert manager_client.post(path).json()["job_id"] == first.json()["job_id"]
    assert process_once() is True
    failed = manager_client.get(f"/calls/{call['id']}").json()
    assert failed["status"] == "failed"
    assert failed["analysis"] is None
    assert "test-only-key" not in failed["failure_reason"]
    with Session(engine) as db:
        assert db.query(AnalysisJob).one().state == "failed"

    def valid_response(self, system, user):
        framework = manager_client.get("/account").json()["coaching_framework"]
        result = SalesAnalyzer()._sample_result(framework)
        return result.model_dump_json()
    monkeypatch.setattr("app.services.glm_client.GLMClient.chat", valid_response)
    assert manager_client.post(path).status_code == 202
    assert process_once() is True
    detail = manager_client.get(f"/calls/{call['id']}").json()
    assert detail["status"] == "analyzed"
    assert detail["analysis"]["source_mode"] == "model"
    analysis_id = detail["analysis"]["id"]
    assert manager_client.post(path).json()["state"] == "done"
    assert manager_client.get(f"/calls/{call['id']}").json()["analysis"]["id"] == analysis_id
    assert manager_client.get("/dashboard/overview").json()["analyzed_calls"] == 1


def test_consent_scope_and_sample_flags_are_enforced(manager_client, rep_id):
    assert manager_client.post("/calls", json={"rep_id": rep_id, "transcript": "Buyer: Test"}).status_code == 400
    assert manager_client.post("/calls", json={"rep_id": rep_id, "consent_confirmed": True,
                                               "is_sample": True}).status_code == 422
    assert manager_client.post("/calls", json={"rep_id": rep_id, "consent_confirmed": True,
                                               "organization_id": "another-workspace"}).status_code == 403
    assert manager_client.post("/calls", json={"rep_id": rep_id, "consent_confirmed": True,
                                               "transcript": "   "}).status_code == 422


def test_analysis_rechecks_consent_when_workspace_policy_changes(manager_client, rep_id):
    manager_client.patch("/account", json={"recording_consent_required": False})
    call = create_call(manager_client, rep_id, consent_confirmed=False)
    manager_client.patch("/account", json={"recording_consent_required": True})
    assert manager_client.post(f"/calls/{call['id']}/analyze").status_code == 400
    assert manager_client.patch(f"/calls/{call['id']}/consent", json={"consent_confirmed": True,
                                                                   "consent_notes": "Buyer granted permission."}).status_code == 200
    assert manager_client.post(f"/calls/{call['id']}/analyze").status_code == 503


def test_redaction_applies_before_storage_and_retroactively(manager_client, rep_id):
    call = create_call(manager_client, rep_id, transcript="Buyer: Contact alice@example.com or (206) 555-0123.")
    assert "alice@example.com" in call["transcript"]
    update = manager_client.patch("/account", json={"pii_redaction_enabled": True,
                                                    "offer_context": {"offer": "Email alice@example.com"}})
    assert update.status_code == 200
    redacted = manager_client.get(f"/calls/{call['id']}").json()
    assert "alice@example.com" not in str(redacted)
    assert "555-0123" not in str(redacted)
    assert "[REDACTED EMAIL]" in redacted["transcript_segments"][0]["text"]
    assert "alice@example.com" not in str(update.json()["offer_context"])
    changed_context = manager_client.patch("/account", json={"offer_context": {"offer": "Email contact@example.com"}})
    assert "contact@example.com" not in str(changed_context.json()["offer_context"])
    newer = create_call(manager_client, rep_id, transcript="Buyer: Send it to bob@example.com.")
    assert "bob@example.com" not in str(newer)
    assert manager_client.get("/account/audit").status_code == 200


def test_redaction_never_changes_a_rep_identifier(manager_client):
    from app.models.rep import Rep
    numerical_id = "12345678-1234-4123-8123-123456789012"
    org_id = manager_client.get("/auth/me").json()["user"]["organization_id"]
    with Session(engine) as db:
        db.add(Rep(id=numerical_id, name="Test Rep", organization_id=org_id))
        db.commit()
    manager_client.patch("/account", json={"pii_redaction_enabled": True})
    call = create_call(manager_client, numerical_id, transcript="Buyer: Email buyer@example.com.")
    assert call["rep_id"] == numerical_id
    assert "[REDACTED EMAIL]" in call["transcript"]


def test_enabling_redaction_requeues_a_running_job_without_stranding_it(manager_client, rep_id, monkeypatch):
    monkeypatch.setattr(settings, "mock_ai", False)
    monkeypatch.setattr(settings, "zai_api_key", "test-key-not-used")
    call = create_call(manager_client, rep_id, transcript=SAMPLE_TRANSCRIPT + "\nBuyer: Contact buyer@example.com.")
    manager_client.post(f"/calls/{call['id']}/analyze")
    with Session(engine) as db:
        job = db.query(AnalysisJob).one()
        job.state, job.attempts, job.lease_token, job.lease_until = "running", 3, "old-lease", utcnow() + timedelta(minutes=5)
        db.commit()
    assert manager_client.patch("/account", json={"pii_redaction_enabled": True}).status_code == 200
    with Session(engine) as db:
        job = db.query(AnalysisJob).one()
        assert job.state == "queued" and job.attempts == 0 and job.lease_token is None
        job.state, job.lease_token = "running", "new-lease"
        db.commit()
    # Saving an already-enabled policy must not interrupt in-flight work again.
    manager_client.patch("/account", json={"pii_redaction_enabled": True, "data_retention_days": 180})
    with Session(engine) as db:
        assert db.query(AnalysisJob).one().lease_token == "new-lease"


class FakeTranscription:
    bucket = "test-audio"
    deleted = []

    @staticmethod
    def validate_audio_type(file_type):
        if file_type != "audio/mpeg":
            raise ValueError("Unsupported audio type")

    def generate_presigned_post(self, file_name, file_type, prefix):
        return {"url": "https://uploads.example.test",
                "fields": {"key": prefix + file_name, "Content-Type": file_type}}

    def start_transcription_job(self, s3_uri, job_name):
        assert s3_uri.startswith("s3://test-audio/uploads/")
        return job_name

    def get_job_status(self, job_name):
        return {"TranscriptionJobStatus": "COMPLETED"}

    def get_transcript_segments(self, job_name):
        return [{"id": "s1", "speaker": "spk_0", "text": "Send it to buyer@example.com.",
                 "start_seconds": 2.3, "end_seconds": 4.8}]

    def delete_call_artifacts(self, audio_s3_key, transcription_job_id):
        self.deleted.append((audio_s3_key, transcription_job_id))


def test_audio_keys_are_scoped_and_worker_preserves_source_metadata(manager_client, rep_id, monkeypatch):
    FakeTranscription.deleted = []
    monkeypatch.setattr("app.routes.calls.TranscriptionService", FakeTranscription)
    monkeypatch.setattr("app.services.audio_jobs.TranscriptionService", FakeTranscription)
    monkeypatch.setattr("app.services.transcription.TranscriptionService", FakeTranscription)
    call = create_call(manager_client, rep_id, transcript=None)
    params = {"call_id": call["id"], "file_name": "call.mp3", "file_type": "audio/mpeg"}
    upload = manager_client.post("/calls/upload-url", params=params)
    assert upload.status_code == 200
    key = upload.json()["key"]
    assert key.startswith(f"uploads/{call['organization_id']}/{call['id']}/")
    assert manager_client.post(f"/calls/{call['id']}/transcribe", params={"s3_key": "uploads/other.mp3"}).status_code == 403
    start = manager_client.post(f"/calls/{call['id']}/transcribe", params={"s3_key": key})
    assert start.status_code == 200
    assert manager_client.get(f"/calls/{call['id']}/transcribe/status").json()["call_status"] == "transcribing"
    with Session(engine) as db:
        refresh_transcriptions(db)
    detail = manager_client.get(f"/calls/{call['id']}").json()
    assert detail["status"] == "transcribed"
    assert detail["transcript_segments"][0]["speaker"] == "spk_0"
    assert detail["transcript_segments"][0]["start_seconds"] == 2.3
    assert manager_client.delete(f"/calls/{call['id']}").status_code == 204
    assert FakeTranscription.deleted == [(key, start.json()["transcription_job_id"])]


def test_redacted_audio_cleans_up_raw_artifacts(manager_client, rep_id, monkeypatch):
    FakeTranscription.deleted = []
    monkeypatch.setattr("app.routes.calls.TranscriptionService", FakeTranscription)
    monkeypatch.setattr("app.services.audio_jobs.TranscriptionService", FakeTranscription)
    monkeypatch.setattr("app.services.transcription.TranscriptionService", FakeTranscription)
    manager_client.patch("/account", json={"pii_redaction_enabled": True})
    call = create_call(manager_client, rep_id, transcript=None)
    key = manager_client.post("/calls/upload-url", params={"call_id": call["id"], "file_name": "call.mp3",
                                                          "file_type": "audio/mpeg"}).json()["key"]
    manager_client.post(f"/calls/{call['id']}/transcribe", params={"s3_key": key})
    with Session(engine) as db:
        refresh_transcriptions(db)
    detail = manager_client.get(f"/calls/{call['id']}").json()
    assert "[REDACTED EMAIL]" in detail["transcript"]
    assert detail["audio_s3_key"] is None
    assert detail["transcription_job_id"] is None
    assert FakeTranscription.deleted


def test_upload_rejects_non_audio(manager_client, rep_id):
    call = create_call(manager_client, rep_id, transcript=None)
    response = manager_client.post("/calls/upload-url", params={"call_id": call["id"], "file_name": "notes.txt",
                                                                "file_type": "text/plain"})
    assert response.status_code == 400


def test_a_saved_transcript_cannot_be_replaced_while_its_score_is_pending(manager_client, rep_id):
    call = create_call(manager_client, rep_id)
    response = manager_client.post("/calls/upload-url", params={"call_id": call["id"], "file_name": "other.mp3",
                                                                "file_type": "audio/mpeg"})
    assert response.status_code == 409


def test_cleanup_failures_keep_records_for_retry(manager_client, rep_id, monkeypatch):
    call = create_call(manager_client, rep_id)
    with Session(engine) as db:
        db.get(Call, call["id"]).audio_s3_key = "uploads/test/call.mp3"
        db.commit()
    def fail(*args):
        raise RuntimeError("storage unavailable")
    monkeypatch.setattr("app.routes.calls.delete_artifacts", fail)
    assert manager_client.delete(f"/calls/{call['id']}").status_code == 502
    assert manager_client.get(f"/calls/{call['id']}").status_code == 200
    monkeypatch.setattr("app.services.privacy.delete_artifacts", fail)
    with Session(engine) as db:
        row = db.get(Call, call["id"])
        row.created_at = utcnow() - timedelta(days=100)
        db.commit()
        assert purge_expired(db) == {"deleted": 0, "failed": 1}
        assert db.get(Call, call["id"]) is not None
    monkeypatch.setattr("app.services.privacy.delete_artifacts", lambda *args: None)
    with Session(engine) as db:
        assert purge_expired(db) == {"deleted": 1, "failed": 0}


def test_retention_cascades_analysis_jobs_and_assignments(manager_client):
    sample_id = manager_client.post("/onboarding/sample").json()["call_id"]
    assignment = manager_client.post("/coaching", json={"call_id": sample_id, "skill": "money_readiness",
                                                        "instructions": "Rehearse two questions about the investment concern."})
    assert assignment.status_code == 201
    with Session(engine) as db:
        call = db.get(Call, sample_id)
        call.created_at = utcnow() - timedelta(days=100)
        db.add(AnalysisJob(call_id=call.id, organization_id=call.organization_id, rubric_snapshot={}))
        db.commit()
        assert purge_expired(db)["deleted"] == 1
        assert db.query(CallAnalysis).count() == 0
        assert db.query(AnalysisJob).count() == 0
        assert db.query(CoachingAssignment).count() == 0
        assert db.query(AuditEvent).filter(AuditEvent.action == "retention_deleted").count() == 1


def test_old_transcription_poll_cannot_regress_analyzed_call(manager_client):
    sample_id = manager_client.post("/onboarding/sample").json()["call_id"]
    response = manager_client.get(f"/calls/{sample_id}/transcribe/status")
    assert response.json()["call_status"] == "analyzed"
    assert manager_client.get(f"/calls/{sample_id}").json()["status"] == "analyzed"
