from datetime import timedelta
from urllib.parse import urlparse, parse_qs

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine
from app.main import app
from app.models.user import User
from app.models.workspace import AuthSession, Invitation, RateLimit
from app.security import token_hash, utcnow, hash_password, verify_password, consume_limit
from conftest import PASSWORD, accept_invite, signup


@pytest.mark.parametrize("path", ["/calls", "/reps", "/account", "/account/audit", "/coaching", "/dashboard/overview"])
def test_private_endpoints_require_a_session(client, path):
    assert client.get(path).status_code == 401


def test_cookie_csrf_origin_and_logout(manager_client):
    csrf = manager_client.headers.pop("X-CSRF-Token")
    assert manager_client.post("/reps", json={"name": "Test"}).status_code == 403
    manager_client.headers["X-CSRF-Token"] = csrf
    assert manager_client.post("/reps", headers={"Origin": "https://evil.example"},
                               json={"name": "Test"}).status_code == 403
    assert manager_client.post("/reps", headers={"Origin": "http://localhost:3000"},
                               json={"name": "Test"}).status_code == 201
    me = manager_client.get("/auth/me")
    assert me.headers["cache-control"] == "no-store"
    cookie = manager_client.cookies.get("revenuecoach_session")
    with Session(engine) as db:
        assert db.get(AuthSession, token_hash(cookie)) is not None
        assert db.get(AuthSession, cookie) is None
    assert manager_client.post("/auth/logout").status_code == 204
    manager_client.cookies.set("revenuecoach_session", cookie)
    assert manager_client.get("/auth/me").status_code == 401


def test_password_hash_expiry_and_validation(manager_client):
    encoded = hash_password(PASSWORD)
    assert encoded != PASSWORD and verify_password(PASSWORD, encoded)
    assert not verify_password("wrong", encoded)
    with Session(engine) as db:
        row = db.query(AuthSession).one()
        row.expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert manager_client.get("/auth/me").status_code == 401
    assert manager_client.post("/auth/signup", json={"name": "Someone", "workspace_name": "Team",
                                                     "email": "invalid", "password": PASSWORD}).status_code == 422


def test_tenants_cannot_read_or_write_each_others_records(manager_client, rep_id):
    call = manager_client.post("/calls", json={"rep_id": rep_id, "consent_confirmed": True,
                                               "transcript": "Buyer: A private transcript."}).json()
    with TestClient(app) as other:
        signup(other, "other@example.com")
        assert other.get("/calls").json() == []
        assert other.get(f"/calls/{call['id']}").status_code == 404
        assert other.delete(f"/calls/{call['id']}").status_code == 404
        assert other.post(f"/calls/{call['id']}/analyze").status_code == 404
        assert other.post("/calls", json={"rep_id": rep_id, "consent_confirmed": True}).status_code == 404
        assert other.patch(f"/account/members/{manager_client.get('/auth/me').json()['user']['id']}",
                           json={"role": "rep", "active": False}).status_code == 404


def test_invites_are_single_use_and_reps_have_only_their_own_scope(manager_client, rep_id):
    call = manager_client.post("/calls", json={"rep_id": rep_id, "consent_confirmed": True,
                                               "transcript": "Buyer: A private transcript."}).json()
    invited = manager_client.post("/auth/invitations", json={"email": "rep@example.com", "role": "rep"})
    assert invited.status_code == 201
    token = parse_qs(urlparse(invited.json()["url"]).fragment)["token"][0]
    with Session(engine) as db:
        assert db.query(Invitation).one().token_hash == token_hash(token)
    with TestClient(app) as rep_client:
        accept_invite(rep_client, token)
        assert rep_client.post("/auth/accept-invite", json={"token": token, "name": "Reused",
                                                            "password": PASSWORD}).status_code == 400
        assert rep_client.get("/calls").json() == []
        assert rep_client.get(f"/calls/{call['id']}").status_code == 404
        assert rep_client.patch("/account", json={"organization_name": "Takeover"}).status_code == 403
        assert rep_client.post("/reps", json={"name": "Another"}).status_code == 403
        own = rep_client.get("/reps").json()
        assert len(own) == 1
        created = rep_client.post("/calls", json={"rep_id": own[0]["id"], "consent_confirmed": True,
                                                  "transcript": "Buyer: My own conversation."})
        assert created.status_code == 201
        assert len(rep_client.get("/calls").json()) == 1
        assert len(rep_client.get("/account").json()["users"]) == 1
        assert manager_client.get(f"/calls/{created.json()['id']}").status_code == 200
        member_id = rep_client.get("/auth/me").json()["user"]["id"]
        assert manager_client.patch(f"/account/members/{member_id}", json={"role": "rep", "active": False}).status_code == 200
        assert rep_client.get("/auth/me").status_code == 401


def test_invite_expiry_revocation_and_last_manager_guard(manager_client):
    invited = manager_client.post("/auth/invitations", json={"email": "expired@example.com"}).json()
    token = parse_qs(urlparse(invited["url"]).fragment)["token"][0]
    with Session(engine) as db:
        db.get(Invitation, invited["id"]).expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert manager_client.post("/auth/accept-invite", json={"token": token, "name": "Expired",
                                                            "password": PASSWORD}).status_code == 400
    assert manager_client.delete(f"/auth/invitations/{invited['id']}").status_code == 204
    own = manager_client.get("/auth/me").json()["user"]["id"]
    assert manager_client.patch(f"/account/members/{own}", json={"role": "rep", "active": True}).status_code == 409


def test_role_lock_refreshes_cached_actor_before_mutating_members(manager_client):
    from fastapi import HTTPException
    from app.routes.account import MemberUpdate, update_member
    org_id = manager_client.get("/auth/me").json()["user"]["organization_id"]
    with Session(engine) as db:
        first = db.query(User).filter(User.organization_id == org_id).one()
        first_id = first.id
        second = User(name="Other Manager", email="other-manager@example.com", organization_id=org_id,
                      password_hash=hash_password(PASSWORD), role="manager")
        db.add(second)
        db.commit()
        second_id = second.id
    with Session(engine) as stale:
        actor = stale.get(User, second_id)
        with Session(engine) as concurrent:
            concurrent.get(User, second_id).role = "rep"
            concurrent.commit()
        assert actor.role == "manager"
        with pytest.raises(HTTPException) as error:
            update_member(first_id, MemberUpdate(active=False, role="rep"), stale, actor)
        assert error.value.status_code == 403
        assert stale.get(User, first_id).active is True


def test_password_change_revokes_old_sessions(manager_client):
    with TestClient(app) as second:
        login = second.post("/auth/login", json={"email": "manager@example.com", "password": PASSWORD})
        assert login.status_code == 200
        response = manager_client.post("/auth/password", json={"current_password": PASSWORD,
                                                                 "new_password": PASSWORD + "-new"})
        assert response.status_code == 200
        manager_client.headers["X-CSRF-Token"] = response.json()["csrf_token"]
        assert manager_client.get("/auth/me").status_code == 200
        assert second.get("/auth/me").status_code == 401
        assert second.post("/auth/login", json={"email": "manager@example.com", "password": PASSWORD}).status_code == 401


def test_password_recovery_is_single_use_revokes_sessions_and_does_not_return_token(manager_client, monkeypatch):
    sent = []
    monkeypatch.setattr(settings, "auth_email_from", "verified@example.com")
    monkeypatch.setattr("app.routes.auth.send_password_reset", lambda email, token: sent.append((email, token)))
    request = manager_client.post("/auth/forgot-password", json={"email": "manager@example.com"})
    unknown = manager_client.post("/auth/forgot-password", json={"email": "unknown@example.com"})
    assert request.json() == unknown.json()
    assert len(sent) == 1
    token = sent[0][1]
    assert token not in request.text
    assert manager_client.post("/auth/reset-password", json={"token": token, "password": PASSWORD + "-new"}).status_code == 200
    assert manager_client.get("/auth/me").status_code == 401
    assert manager_client.post("/auth/reset-password", json={"token": token, "password": PASSWORD + "-new"}).status_code == 400
    assert manager_client.post("/auth/login", json={"email": "manager@example.com", "password": PASSWORD + "-new"}).status_code == 200


def test_recovery_configuration_error_is_explicit(client):
    assert client.post("/auth/forgot-password", json={"email": "any@example.com"}).status_code == 503


def test_rate_limit_persists_and_expired_window_resets():
    from fastapi import HTTPException
    with Session(engine) as db:
        consume_limit(db, "test-bucket", 2, 900)
        consume_limit(db, "test-bucket", 2, 900)
        with pytest.raises(HTTPException) as error:
            consume_limit(db, "test-bucket", 2, 900)
        assert error.value.status_code == 429
        row = db.query(RateLimit).one()
        row.expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
        consume_limit(db, "test-bucket", 2, 900)
        assert db.get(RateLimit, token_hash("test-bucket")).count == 1


def test_client_ip_is_trusted_only_for_the_configured_proxy(monkeypatch):
    from starlette.requests import Request
    from app.security import request_peer
    monkeypatch.setattr(settings, "proxy_secret", "test-secret")
    def request(secret):
        return Request({"type": "http", "headers": [(b"x-revenuecoach-proxy-secret", secret.encode()),
                        (b"x-revenuecoach-client-ip", b"192.0.2.7")], "client": ("127.0.0.1", 123)})
    assert request_peer(request("forged")) == "127.0.0.1"
    assert request_peer(request("test-secret")) == "192.0.2.7"
