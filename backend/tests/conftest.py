import os

os.environ.update({
    "DATABASE_URL": os.environ.get("TEST_DATABASE_URL", "sqlite://"), "MOCK_AI": "true", "ZAI_API_KEY": "",
    "AWS_REGION": "us-east-1", "AWS_S3_BUCKET": "test-audio",
    "AUTO_CREATE_SCHEMA": "false", "FRONTEND_URL": "http://localhost:3000",
    "SESSION_COOKIE_SECURE": "false", "SESSION_COOKIE_SAMESITE": "lax",
    "AUTH_EMAIL_FROM": "", "CORS_ORIGINS": '["http://localhost:3000"]',
})

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app

PASSWORD = "test-password-long-enough"


def signup(client, email="manager@example.com"):
    result = client.post("/auth/signup", json={"name": "Test Manager", "email": email,
                                               "workspace_name": "Test Team", "password": PASSWORD})
    assert result.status_code == 201, result.text
    client.headers["X-CSRF-Token"] = result.json()["csrf_token"]
    return result.json()["user"]


def accept_invite(client, token, name="Test Rep"):
    result = client.post("/auth/accept-invite", json={"token": token, "name": name, "password": PASSWORD})
    assert result.status_code == 201, result.text
    client.headers["X-CSRF-Token"] = result.json()["csrf_token"]
    return result.json()["user"]


@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


@pytest.fixture
def manager_client(client):
    from sqlalchemy.orm import Session
    from app.models.organization import Organization
    user = signup(client)
    with Session(engine) as db:
        db.get(Organization, user["organization_id"]).processing_enabled = True
        db.commit()
    return client


@pytest.fixture
def rep_id(manager_client):
    response = manager_client.post("/reps", json={"name": "Avery Seller", "email": "avery@example.com"})
    assert response.status_code == 201, response.text
    return response.json()["id"]
