"""Regression tests for configuration guards, authorization scoping and credential handling."""

import pytest

from app import create_app


def _login(client, email, password="Hackathon2026!"):
    resp = client.post("/api/v1/auth/dev/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.get_json()['data']['access_token']}"}


# --- startup guards -----------------------------------------------------------------------
def test_unknown_config_name_is_rejected():
    with pytest.raises(RuntimeError, match="Unknown configuration"):
        create_app("prod")


def test_production_requires_database_url(monkeypatch):
    from app.config import ProductionConfig

    monkeypatch.setattr(ProductionConfig, "DATABASE_URL", None)
    with pytest.raises(RuntimeError, match="In-memory persistence"):
        create_app("production")


@pytest.mark.parametrize("weak", ["dev-jwt-secret-key-campus-sprint-2026", "short"])
def test_production_rejects_weak_secrets(monkeypatch, weak):
    from app.config import ProductionConfig

    monkeypatch.setattr(ProductionConfig, "DATABASE_URL", "postgresql://u:p@localhost/db")
    monkeypatch.setattr(ProductionConfig, "SECRET_KEY", "x" * 40)
    monkeypatch.setattr(ProductionConfig, "JWT_SECRET_KEY", weak)
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        create_app("production")


def test_production_config_pins_env_so_dev_routes_stay_off(monkeypatch):
    from app.config import ProductionConfig

    monkeypatch.setenv("FLASK_ENV", "development")  # must not leak into the production profile
    assert ProductionConfig.ENV == "production"


# --- dev auth ------------------------------------------------------------------------------
def test_dev_signup_never_stores_plaintext_password(app, client):
    resp = client.post(
        "/api/v1/auth/dev/signup",
        json={
            "full_name": "Test User", "email": "tester@example.edu", "college": "Test College",
            "password": "S3cure-Pass!", "confirm_password": "S3cure-Pass!",
        },
    )
    assert resp.status_code == 201
    stored = app.repositories["user"].get_by_email("tester@example.edu")
    assert "password" not in stored
    assert stored["password_hash"] and "S3cure-Pass!" not in stored["password_hash"]
    login = client.post("/api/v1/auth/dev/login", json={"email": "tester@example.edu", "password": "S3cure-Pass!"})
    assert login.status_code == 200
    bad = client.post("/api/v1/auth/dev/login", json={"email": "tester@example.edu", "password": "wrong-pass"})
    assert bad.status_code == 401


def test_logout_revokes_token(client):
    headers = _login(client, "arjun.m@student.example.edu")
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


# --- team-scoped reads ---------------------------------------------------------------------
def test_submission_read_is_limited_to_team_members_and_staff(client):
    member = _login(client, "riya.s@student.example.edu")  # team-001 member, plain participant
    outsider = _login(client, "ananya.d@student.example.edu")  # team-003 member
    admin = _login(client, "admin@campuscrafters.com", "AdminHackathon2026!")

    assert client.get("/api/v1/teams/team-001/submission", headers=member).status_code == 200
    assert client.get("/api/v1/teams/team-001/submission", headers=admin).status_code == 200
    denied = client.get("/api/v1/teams/team-001/submission", headers=outsider)
    assert denied.status_code == 403 and denied.get_json()["error"]["code"] == "FORBIDDEN"
    assert client.get("/api/v1/teams/team-001/problem-statement", headers=outsider).status_code == 403
    assert client.get("/api/v1/teams/nope/submission", headers=member).status_code == 404


# --- evaluation ----------------------------------------------------------------------------
def _submit_team_001(client):
    leader = _login(client, "arjun.m@student.example.edu")
    payload = {
        "project_title": "SplitEasy", "short_description": "Split bills with UPI links instantly.",
        "detailed_description": "A mobile-first tool that divides receipts and generates UPI payment links.",
        "repository_url": "https://github.com/example/spliteasy", "tech_stack": ["Flask", "JS"],
    }
    resp = client.post("/api/v1/teams/team-001/submission/submit", json=payload, headers=leader)
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()["data"]["id"]


def test_only_submitted_projects_can_be_scored_and_only_while_judging(client):
    admin = _login(client, "admin@campuscrafters.com", "AdminHackathon2026!")
    score = {"innovation_score": 25, "technical_score": 20, "uiux_score": 15, "impact_score": 10, "feedback": "Nice"}
    client.patch("/api/v1/admin/event-state", json={"event_state": "judging"}, headers=admin)

    # draft (not submitted) is not scorable
    assert client.post("/api/v1/evaluator/submissions/sub-002/scores", json=score, headers=admin).status_code == 404

    client.patch("/api/v1/admin/event-state", json={"event_state": "event_live"}, headers=admin)
    sub_id = _submit_team_001(client)

    # submitted but event not in judging -> locked
    assert client.post(f"/api/v1/evaluator/submissions/{sub_id}/scores", json=score, headers=admin).status_code == 423

    client.patch("/api/v1/admin/event-state", json={"event_state": "judging"}, headers=admin)
    ok = client.post(f"/api/v1/evaluator/submissions/{sub_id}/scores", json=score, headers=admin)
    assert ok.status_code == 200 and ok.get_json()["data"]["total_score"] == 70

    # upsert: re-score replaces, total recomputed server-side
    score["innovation_score"] = 30
    forged = client.post(f"/api/v1/evaluator/submissions/{sub_id}/scores", json={**score, "total_score": 999}, headers=admin)
    assert forged.status_code == 400  # clients can never supply the total
    again = client.post(f"/api/v1/evaluator/submissions/{sub_id}/scores", json=score, headers=admin)
    assert again.get_json()["data"]["total_score"] == 75

    listing = client.get("/api/v1/evaluator/submissions", headers=admin).get_json()["data"]
    assert [s["id"] for s in listing] == [sub_id] and listing[0]["has_evaluated"] is True

    # participants cannot judge
    participant = _login(client, "riya.s@student.example.edu")
    assert client.get("/api/v1/evaluator/submissions", headers=participant).status_code == 403


# --- announcements: optional auth personalises is_read ---------------------------------------
def test_announcement_read_flag_is_per_user_and_public_listing_still_works(client):
    headers = _login(client, "arjun.m@student.example.edu")
    anon = client.get("/api/v1/announcements").get_json()["data"]
    assert anon and all(a["is_read"] is False for a in anon)

    first = anon[0]["id"]
    client.post(f"/api/v1/announcements/{first}/read", headers=headers)
    mine = {a["id"]: a["is_read"] for a in client.get("/api/v1/announcements", headers=headers).get_json()["data"]}
    assert mine[first] is True
    other = _login(client, "riya.s@student.example.edu")
    theirs = {a["id"]: a["is_read"] for a in client.get("/api/v1/announcements", headers=other).get_json()["data"]}
    assert theirs[first] is False

    # a junk/stale token degrades to anonymous instead of failing the public endpoint
    stale = client.get("/api/v1/announcements", headers={"Authorization": "Bearer not-a-real-token"})
    assert stale.status_code == 200
