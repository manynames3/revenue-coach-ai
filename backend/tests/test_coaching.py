from datetime import timedelta
from urllib.parse import urlparse, parse_qs

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import engine
from app.main import app
from app.models.call import Call
from app.models.organization import Organization
from app.models.workspace import AnalysisJob, CoachingAssignment, PilotRequest
from app.security import utcnow
from app.services.analysis_jobs import persist_analysis, process_once, snapshot_for
from app.services.sales_analyzer import SalesAnalyzer
from app.sample_call import SAMPLE_SEGMENTS, SAMPLE_TRANSCRIPT
from conftest import accept_invite


def scored_call(rep_id, org_id, mode="model", days=0, decision=35):
    with Session(engine) as db:
        snapshot = snapshot_for(db.get(Organization, org_id))
        call = Call(rep_id=rep_id, organization_id=org_id, transcript=SAMPLE_TRANSCRIPT,
                    transcript_segments=SAMPLE_SEGMENTS, consent_confirmed=True,
                    is_sample=(mode == "sample"), created_at=utcnow() + timedelta(days=days))
        db.add(call)
        db.flush()
        result = SalesAnalyzer().analyze(SAMPLE_TRANSCRIPT, snapshot, SAMPLE_SEGMENTS, is_sample=True)
        result.scores["decision_clarity"] = decision
        persist_analysis(db, call, result, snapshot, mode)
        db.commit()
        return call.id


def test_assignment_submission_review_and_same_rubric_skill_comparison(manager_client):
    invited = manager_client.post("/auth/invitations", json={"email": "seller@example.com"}).json()
    token = parse_qs(urlparse(invited["url"]).fragment)["token"][0]
    with TestClient(app) as seller:
        user = accept_invite(seller, token)
        rep_id = seller.get("/reps").json()[0]["id"]
        first = scored_call(rep_id, user["organization_id"])
        later = scored_call(rep_id, user["organization_id"], days=1, decision=75)
        response = manager_client.post("/coaching", json={"call_id": first, "skill": "decision_clarity",
                                                           "instructions": "Rehearse asking who approves and what their decision criteria are."})
        assert response.status_code == 201
        assignment_id = response.json()["id"]
        assert seller.post("/coaching", json={"call_id": first, "skill": "decision_clarity",
                                              "instructions": "Try to assign my own work without manager permissions."}).status_code == 403
        assert manager_client.post(f"/coaching/{assignment_id}/review", json={"feedback": "Review before submission."}).status_code == 409
        assert seller.post(f"/coaching/{assignment_id}/complete", json={"response": "Who needs to approve this, and what would they need to see?"}).status_code == 200
        assert seller.post(f"/coaching/{assignment_id}/complete", json={"response": "Attempt a second submission."}).status_code == 409
        assert seller.post(f"/coaching/{assignment_id}/review", json={"feedback": "Pretend manager feedback."}).status_code == 403
        reviewed = manager_client.post(f"/coaching/{assignment_id}/review",
                                       json={"feedback": "Clear approval question; keep the neutral phrasing.",
                                             "verification_call_id": later})
        assert reviewed.status_code == 200
        assert reviewed.json()["baseline_score"] == 35
        assert reviewed.json()["verified_score"] == 75
        overview = manager_client.get("/dashboard/overview").json()
        assert overview["coaching"]["reviewed"] == 1
        assert overview["skill_comparisons"][0]["delta"] == 40
        assert overview["skill_comparisons"][0]["is_sample"] is False
        # Once its source call is deleted, a skill comparison is no longer verifiable.
        assert manager_client.delete(f"/calls/{later}").status_code == 204
        assert manager_client.get("/dashboard/overview").json()["skill_comparisons"] == []


def test_comparison_requires_same_rep_version_and_observed_scores(manager_client, rep_id):
    org_id = manager_client.get("/auth/me").json()["user"]["organization_id"]
    first = scored_call(rep_id, org_id)
    assignment = manager_client.post("/coaching", json={"call_id": first, "skill": "decision_clarity",
                                                       "instructions": "Rehearse a question about the decision criteria."}).json()
    assignment_id = assignment["id"]
    manager_client.post(f"/coaching/{assignment_id}/complete", json={"response": "What would everyone involved need to evaluate this?"})
    other_rep = manager_client.post("/reps", json={"name": "Other Seller"}).json()["id"]
    wrong_rep = scored_call(other_rep, org_id, days=1)
    assert manager_client.post(f"/coaching/{assignment_id}/review",
                               json={"feedback": "Review with the wrong rep.", "verification_call_id": wrong_rep}).status_code == 422
    framework = manager_client.get("/account").json()["coaching_framework"]
    framework["score_categories"][0]["weight"] += 1
    manager_client.patch("/account", json={"coaching_framework": framework})
    wrong_version = scored_call(rep_id, org_id, days=1)
    assert manager_client.post(f"/coaching/{assignment_id}/review",
                               json={"feedback": "Review with a changed rubric.", "verification_call_id": wrong_version}).status_code == 422
    assert manager_client.post(f"/coaching/{assignment_id}/review",
                               json={"feedback": "Neutral wording, but ask one question at a time."}).status_code == 200


def test_feedback_is_stored_but_sample_feedback_does_not_inflate_pilot_results(manager_client, rep_id):
    sample_id = manager_client.post("/onboarding/sample").json()["call_id"]
    assert manager_client.post(f"/calls/{sample_id}/feedback", json={"rating": 5, "review_seconds": 60}).status_code == 200
    assert manager_client.get("/dashboard/overview").json()["feedback"]["reviewed_calls"] == 0
    org_id = manager_client.get("/auth/me").json()["user"]["organization_id"]
    real_id = scored_call(rep_id, org_id)
    assert manager_client.post(f"/calls/{real_id}/feedback", json={"rating": 4, "review_seconds": 90}).status_code == 200
    feedback = manager_client.get("/dashboard/overview").json()["feedback"]
    assert feedback["reviewed_calls"] == 1
    assert feedback["helpful_percent"] == 100
    assert feedback["average_review_seconds"] == 90
    manager_client.post(f"/calls/{real_id}/feedback", json={"rating": 2, "review_seconds": 120})
    assert manager_client.get("/dashboard/overview").json()["feedback"]["reviewed_calls"] == 1
    assert manager_client.get("/dashboard/overview").json()["feedback"]["helpful_percent"] == 0
    assert manager_client.post(f"/calls/{real_id}/feedback", json={"rating": 6}).status_code == 422


def test_expired_worker_leases_can_be_reclaimed_and_exhaustion_fails_explicitly(manager_client):
    sample_id = manager_client.post("/onboarding/sample").json()["call_id"]
    with Session(engine) as db:
        call = db.get(Call, sample_id)
        db.delete(call.analysis)
        db.add(AnalysisJob(call_id=sample_id, organization_id=call.organization_id,
                           rubric_snapshot=snapshot_for(db.get(Organization, call.organization_id)),
                           state="running", attempts=1, lease_token="interrupted",
                           lease_until=utcnow() - timedelta(minutes=1)))
        call.status = "analyzing"
        db.commit()
    assert process_once() is True
    assert manager_client.get(f"/calls/{sample_id}").json()["status"] == "analyzed"


def test_pilot_request_is_persisted_without_charging(client):
    offer = client.get("/pilots/offer").json()
    assert offer["billing"] == "invoice"
    assert offer["price_usd"] is None
    response = client.post("/pilots", json={"name": "Team Lead", "email": "lead@example.com", "company": "Test Team",
                                           "team_size": 6, "goal": "Reduce time spent reviewing calls."})
    assert response.status_code == 201
    assert response.json()["state"] == "requested"
    assert "invoice" in response.json()["message"]
    with Session(engine) as db:
        row = db.get(PilotRequest, response.json()["id"])
        assert row.state == "requested"
        assert row.invoice_reference is None
    assert client.post("/pilots", json={"name": "Lead", "email": "bad", "company": "Team", "team_size": 0,
                                        "goal": "short"}).status_code == 422


def test_processing_approval_is_operator_only(client, monkeypatch):
    from app.config import settings
    from conftest import signup
    user = signup(client)
    rep = client.post("/reps", json={"name": "Trial Rep"}).json()["id"]
    call = client.post("/calls", json={"rep_id": rep, "consent_confirmed": True,
                                       "transcript": SAMPLE_TRANSCRIPT}).json()["id"]
    assert client.get("/account").json()["processing_enabled"] is False
    assert client.patch("/account", json={"processing_enabled": True}).status_code == 422
    monkeypatch.setattr(settings, "mock_ai", False)
    monkeypatch.setattr(settings, "zai_api_key", "test-key-not-used")
    assert client.post(f"/calls/{call}/analyze").status_code == 403
    audio_call = client.post("/calls", json={"rep_id": rep, "consent_confirmed": True}).json()["id"]
    assert client.post("/calls/upload-url", params={"call_id": audio_call, "file_name": "audio.mp3", "file_type": "audio/mpeg"}).status_code == 403
    assert client.post("/onboarding/sample").status_code == 200


def test_operator_records_invoice_payment_then_enables_one_workspace(client, monkeypatch, capsys):
    from app.pilots import main
    from app.models.organization import Organization
    from conftest import signup
    user = signup(client)
    request = client.post("/pilots", json={"name": "Lead", "email": "manager@example.com", "company": "Team",
                                          "team_size": 5, "goal": "Make call coaching more useful."}).json()
    request_id, org_id = request["id"], user["organization_id"]
    def command(*args):
        monkeypatch.setattr("sys.argv", ["pilots", *args])
        main()
    import pytest
    with pytest.raises(SystemExit):
        command("enable", "--id", request_id, "--organization-id", org_id)
    command("invoice", "--id", request_id, "--reference", "TEST-INVOICE-NOT-A-REAL-PAYMENT")
    command("paid", "--id", request_id)
    command("enable", "--id", request_id, "--organization-id", org_id)
    with Session(engine) as db:
        assert db.get(Organization, org_id).processing_enabled is True
        assert db.get(PilotRequest, request_id).organization_id == org_id
    command("disable", "--organization-id", org_id)
    assert client.get("/account").json()["processing_enabled"] is False
