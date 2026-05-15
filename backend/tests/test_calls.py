import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["MOCK_AI"] = "true"
os.environ["AWS_REGION"] = "us-east-1"
os.environ["AWS_S3_BUCKET"] = "test-audio"

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import Base, engine
from app.main import app
from app.models import call, call_analysis, organization, rep, user  # noqa: F401
from app.models.organization import Organization


def seed_default_org() -> None:
    with Session(engine) as session:
        session.add(Organization(id="default", name="Default Org"))
        session.commit()


def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_default_org()


def create_rep(client: TestClient) -> str:
    response = client.post("/reps", json={"name": "Avery Seller", "email": "avery@example.com"})
    assert response.status_code == 200
    return response.json()["id"]


def test_transcript_call_analysis_is_stateful_and_idempotent():
    reset_database()
    with TestClient(app) as client:
        rep_id = create_rep(client)

        create_response = client.post(
            "/calls",
            json={
                "rep_id": rep_id,
                "lead_name": "Jordan Lee",
                "transcript": "Rep: Hi Jordan. Customer: I need pricing before next week.",
            },
        )
        assert create_response.status_code == 200
        call_payload = create_response.json()
        call_id = call_payload["id"]
        assert call_payload["status"] == "transcribed"

        first_analysis = client.post(f"/calls/{call_id}/analyze")
        assert first_analysis.status_code == 200
        first_payload = first_analysis.json()
        assert first_payload["overall_score"] == 72

        second_analysis = client.post(f"/calls/{call_id}/analyze")
        assert second_analysis.status_code == 200
        assert second_analysis.json()["id"] == first_payload["id"]

        detail = client.get(f"/calls/{call_id}")
        assert detail.status_code == 200
        detail_payload = detail.json()
        assert detail_payload["status"] == "analyzed"
        assert detail_payload["analysis_retry_count"] == 1
        assert detail_payload["analysis"]["id"] == first_payload["id"]


def test_audio_transcription_flow_updates_status_and_delete_removes_artifacts(monkeypatch):
    reset_database()

    class FakeTranscriptionService:
        bucket = "test-audio"
        deleted: list[tuple[str | None, str | None]] = []

        @staticmethod
        def validate_audio_type(file_type: str) -> None:
            if file_type != "audio/mpeg":
                raise ValueError("Unsupported audio type")

        def generate_presigned_post(self, file_name: str, file_type: str):
            return {
                "url": "https://uploads.example.test",
                "fields": {"key": f"uploads/{file_name}", "Content-Type": file_type},
            }

        def start_transcription_job(self, s3_uri: str, job_name: str) -> str:
            assert s3_uri == "s3://test-audio/uploads/call.mp3"
            return job_name

        def get_job_status(self, job_name: str):
            return {"TranscriptionJobStatus": "COMPLETED"}

        def get_transcript_text(self, job_name: str) -> str:
            return "Rep: Thanks for joining. Customer: I am evaluating options."

        def delete_call_artifacts(self, audio_s3_key: str | None, transcription_job_id: str | None):
            self.deleted.append((audio_s3_key, transcription_job_id))
            return [audio_s3_key, transcription_job_id]

    monkeypatch.setattr("app.routes.calls.TranscriptionService", FakeTranscriptionService)

    with TestClient(app) as client:
        rep_id = create_rep(client)
        create_response = client.post("/calls", json={"rep_id": rep_id, "lead_name": "Morgan"})
        assert create_response.status_code == 200
        call_id = create_response.json()["id"]

        upload_response = client.post(
            "/calls/upload-url",
            params={"file_name": "call.mp3", "file_type": "audio/mpeg"},
        )
        assert upload_response.status_code == 200
        assert upload_response.json()["key"] == "uploads/call.mp3"

        transcribe_response = client.post(
            f"/calls/{call_id}/transcribe",
            params={"s3_key": "uploads/call.mp3"},
        )
        assert transcribe_response.status_code == 200
        assert transcribe_response.json()["status"] == "transcribing"

        status_response = client.get(f"/calls/{call_id}/transcribe/status")
        assert status_response.status_code == 200
        status_payload = status_response.json()
        assert status_payload["status"] == "COMPLETED"
        assert status_payload["call_status"] == "transcribed"

        detail = client.get(f"/calls/{call_id}")
        assert detail.status_code == 200
        assert detail.json()["transcript"].startswith("Rep: Thanks")

        delete_response = client.delete(f"/calls/{call_id}")
        assert delete_response.status_code == 204
        assert FakeTranscriptionService.deleted == [
            ("uploads/call.mp3", transcribe_response.json()["transcription_job_id"])
        ]
        assert client.get(f"/calls/{call_id}").status_code == 404


def test_upload_url_rejects_non_audio_types():
    reset_database()
    with TestClient(app) as client:
        response = client.post(
            "/calls/upload-url",
            params={"file_name": "notes.txt", "file_type": "text/plain"},
        )
        assert response.status_code == 400
        assert "Unsupported audio type" in response.json()["detail"]
