"""End-to-end tests of the PostgreSQL adapters through the real HTTP API.

Skipped unless TEST_DATABASE_URL points at a *disposable* PostgreSQL database: the schema
script DROPs and recreates every table. Example:

    TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/campus_test pytest tests/integration/test_postgres_backend.py
"""

import os
import pathlib

import pytest

DB_URL = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DB_URL, reason="TEST_DATABASE_URL not set")

DB_DIR = pathlib.Path(__file__).resolve().parents[2] / "database"
PASSWORD = "Pg-Test-Pass1!"


def _run_script(engine, path):
    raw = engine.raw_connection()
    try:
        cur = raw.cursor()
        cur.execute(path.read_text())
        raw.commit()
    finally:
        raw.close()


@pytest.fixture(scope="module")
def pg_app():
    from sqlalchemy import create_engine
    from app import create_app
    from app.config import TestingConfig

    engine = create_engine(DB_URL)
    _run_script(engine, DB_DIR / "schema.sql")
    _run_script(engine, DB_DIR / "seed_production.sql")
    engine.dispose()

    mp = pytest.MonkeyPatch()
    mp.setattr(TestingConfig, "REPOSITORY_TYPE", "database")
    mp.setattr(TestingConfig, "DATABASE_URL", DB_URL)
    app = create_app("testing")
    yield app
    mp.undo()


@pytest.fixture(scope="module")
def api(pg_app):
    return pg_app.test_client()


def _signup(api, name, email):
    resp = api.post(
        "/api/v1/auth/dev/signup",
        json={"full_name": name, "email": email, "college": "Test College", "password": PASSWORD, "confirm_password": PASSWORD},
    )
    assert resp.status_code == 201, resp.get_json()
    data = resp.get_json()["data"]
    return {"id": data["user"]["id"], "h": {"Authorization": f"Bearer {data['access_token']}"}}


def _register(api, user, name, email, phone):
    resp = api.post(
        "/api/v1/registrations",
        headers=user["h"],
        json={"full_name": name, "email": email, "college": "Test College", "experience": "intermediate",
              "track_id": "fintech", "rules_accepted": True, "phone": phone},
    )
    assert resp.status_code == 201, resp.get_json()


@pytest.fixture(scope="module")
def world(pg_app, api):
    """Users: lead, mate, outsider (registered), plus a judge/admin provisioned directly in the DB."""
    users = {}
    for key, name in (("lead", "Lead Person"), ("mate", "Team Mate"), ("out", "Out Sider")):
        email = f"{key}@pg.example.edu"
        users[key] = _signup(api, name, email)
        _register(api, users[key], name, email, f"+91 90000 0000{len(users)}")

    repo = pg_app.repositories["user"]
    repo.create_user({"id": "u-pg-admin", "email": "admin@pg.example.edu", "display_name": "PG Admin",
                      "college": "HQ", "roles": ["admin", "judge", "participant"]})
    from app.security.jwt_utils import generate_token

    with pg_app.app_context():
        token = generate_token("u-pg-admin", ["admin", "judge", "participant"])["access_token"]
    users["admin"] = {"id": "u-pg-admin", "h": {"Authorization": f"Bearer {token}"}}
    return users


def test_health_reports_database_ok(api):
    data = api.get("/api/v1/health").get_json()["data"]
    assert data["status"] == "healthy" and data["database"] == "ok"


def test_seeded_reference_data_and_default_event_state(api):
    assert len(api.get("/api/v1/tracks").get_json()["data"]) == 4
    assert len(api.get("/api/v1/problem-statements").get_json()["data"]) == 6
    state = api.get("/api/v1/config/state").get_json()["data"]
    assert state["event_state"] == "reg_open"


def test_duplicate_registration_conflicts(api, world):
    resp = api.post(
        "/api/v1/registrations", headers=world["lead"]["h"],
        json={"full_name": "Lead Person", "email": "lead@pg.example.edu", "college": "Test College",
              "experience": "beginner", "track_id": "fintech", "rules_accepted": True},
    )
    assert resp.status_code == 409
    me = api.get("/api/v1/registrations/me", headers=world["lead"]["h"])
    assert me.status_code == 200
    assert "CS26-" in str(me.get_json()["data"])  # ticket pass issued


def test_full_participant_to_judge_lifecycle(api, world):
    lead, mate, out, admin = (world[k] for k in ("lead", "mate", "out", "admin"))

    # --- team formation (1 team per user, capacity, join codes)
    created = api.post("/api/v1/teams", headers=lead["h"], json={"name": "Pg Pioneers", "track_id": "fintech"})
    assert created.status_code == 201, created.get_json()
    team = created.get_json()["data"]
    team_id, code = team["id"], team["join_code"]
    assert code.startswith("CS-")

    again = api.post("/api/v1/teams", headers=lead["h"], json={"name": "Second Team", "track_id": "fintech"})
    assert again.status_code == 409 and again.get_json()["error"]["code"] == "USER_ALREADY_IN_TEAM"

    joined = api.post("/api/v1/teams/join", headers=mate["h"], json={"join_code": code.lower()})
    assert joined.status_code == 200, joined.get_json()
    mine = api.get("/api/v1/teams/me", headers=mate["h"]).get_json()["data"]
    assert mine["id"] == team_id and len(mine["members"]) == 2

    # --- problem selection (leader only) and partial draft auto-save
    assert api.put(f"/api/v1/teams/{team_id}/problem-statement", headers=mate["h"], json={"problem_statement_id": "ps-ft-01"}).status_code == 403
    assert api.put(f"/api/v1/teams/{team_id}/problem-statement", headers=lead["h"], json={"problem_statement_id": "ps-ft-01"}).status_code == 200
    d1 = api.put(f"/api/v1/teams/{team_id}/submission/draft", headers=lead["h"], json={"project_title": "PgSplit"})
    assert d1.status_code == 200 and d1.get_json()["data"]["status"] == "DRAFT"
    d2 = api.put(f"/api/v1/teams/{team_id}/submission/draft", headers=lead["h"], json={"tech_stack": ["Flask", "Postgres"]})
    assert d2.status_code == 200
    draft = api.get(f"/api/v1/teams/{team_id}/submission", headers=mate["h"]).get_json()["data"]
    assert draft["project_title"] == "PgSplit" and draft["tech_stack"] == ["Flask", "Postgres"]  # partial saves merged
    assert draft["problem_statement_id"] == "ps-ft-01"
    assert api.get(f"/api/v1/teams/{team_id}/submission", headers=out["h"]).status_code == 403

    # --- final submit locks everything
    final = {
        "project_title": "PgSplit", "short_description": "Split campus bills over UPI quickly.",
        "detailed_description": "Divides receipts proportionally and creates UPI intent links for each person.",
        "repository_url": "https://github.com/example/pgsplit", "tech_stack": ["Flask", "Postgres"],
    }
    sub = api.post(f"/api/v1/teams/{team_id}/submission/submit", headers=lead["h"], json=final)
    assert sub.status_code == 200, sub.get_json()
    sub_id = sub.get_json()["data"]["id"]
    assert api.put(f"/api/v1/teams/{team_id}/submission/draft", headers=lead["h"], json={"project_title": "Hack"}).status_code == 423
    assert api.post(f"/api/v1/teams/{team_id}/submission/submit", headers=lead["h"], json=final).status_code == 423
    assert api.put(f"/api/v1/teams/{team_id}/problem-statement", headers=lead["h"], json={"problem_statement_id": "ps-ft-02"}).status_code == 423
    locked = api.get(f"/api/v1/teams/{team_id}/submission", headers=lead["h"]).get_json()["data"]
    assert locked["status"] == "SUBMITTED" and locked["is_locked"] and locked["project_title"] == "PgSplit"

    # --- admin controls persist, judging window gates scoring
    score = {"innovation_score": 28, "technical_score": 22, "uiux_score": 15, "impact_score": 12, "feedback": "Solid"}
    assert api.post(f"/api/v1/evaluator/submissions/{sub_id}/scores", headers=admin["h"], json=score).status_code == 423
    assert api.patch("/api/v1/admin/event-state", headers=lead["h"], json={"event_state": "judging"}).status_code == 403
    assert api.patch("/api/v1/admin/event-state", headers=admin["h"], json={"event_state": "judging"}).status_code == 200
    state = api.get("/api/v1/config/state").get_json()["data"]
    assert state["event_state"] == "judging" and state["label"] == "Judging"

    listing = api.get("/api/v1/evaluator/submissions", headers=admin["h"]).get_json()["data"]
    assert [s["id"] for s in listing] == [sub_id] and listing[0]["has_evaluated"] is False
    first = api.post(f"/api/v1/evaluator/submissions/{sub_id}/scores", headers=admin["h"], json=score)
    assert first.status_code == 200 and first.get_json()["data"]["total_score"] == 77
    score["impact_score"] = 20
    second = api.post(f"/api/v1/evaluator/submissions/{sub_id}/scores", headers=admin["h"], json=score)
    assert second.get_json()["data"]["total_score"] == 85  # upsert, one row per judge
    detail = api.get(f"/api/v1/evaluator/submissions/{sub_id}", headers=admin["h"]).get_json()["data"]
    assert detail["my_score"]["total_score"] == 85 and detail["submission"]["project_title"] == "PgSplit"
    assert api.post("/api/v1/evaluator/submissions/sub-missing/scores", headers=admin["h"], json=score).status_code == 404


def test_deadline_persists_and_blocks_drafts(api, world):
    admin, out = world["admin"], world["out"]
    api.patch("/api/v1/admin/event-state", headers=admin["h"], json={"event_state": "event_live"})
    team = api.post("/api/v1/teams", headers=out["h"], json={"name": "Late Lads", "track_id": "web3"}).get_json()["data"]
    assert api.put(f"/api/v1/teams/{team['id']}/submission/draft", headers=out["h"], json={"project_title": "ok"}).status_code == 200

    assert api.patch("/api/v1/admin/deadline", headers=admin["h"], json={"submission_deadline_utc": "2020-01-01T00:00:00Z"}).status_code == 200
    assert api.get("/api/v1/config/state").get_json()["data"]["config"]["submission_deadline_utc"] == "2020-01-01T00:00:00Z"
    late = api.put(f"/api/v1/teams/{team['id']}/submission/draft", headers=out["h"], json={"project_title": "late"})
    assert late.status_code == 423 and late.get_json()["error"]["code"] == "DEADLINE_EXPIRED"

    assert api.patch("/api/v1/admin/deadline", headers=admin["h"], json={"submission_deadline_utc": None}).status_code == 200
    assert api.get("/api/v1/config/state").get_json()["data"]["config"]["submission_deadline_utc"] is None


def test_problem_toggle_persists(api, world):
    admin = world["admin"]
    assert api.patch("/api/v1/admin/problem-statements/ps-bg-01/toggle", headers=admin["h"], json={"is_active": False}).status_code == 200
    ids = [p["id"] for p in api.get("/api/v1/problem-statements").get_json()["data"]]
    assert "ps-bg-01" not in ids
    assert api.patch("/api/v1/admin/problem-statements/ps-bg-01/toggle", headers=admin["h"], json={"is_active": True}).status_code == 200
    assert api.patch("/api/v1/admin/problem-statements/nope/toggle", headers=admin["h"], json={"is_active": True}).status_code == 404


def test_announcements_and_read_tracking(api, world):
    admin, lead = world["admin"], world["lead"]
    created = api.post("/api/v1/admin/announcements", headers=admin["h"],
                       json={"title": "Pizza time", "message": "Pizza at 9pm in the main hall.", "category": "event", "priority": "urgent"})
    assert created.status_code == 201, created.get_json()
    ann_id = created.get_json()["data"]["id"]

    items = api.get("/api/v1/announcements?priority=urgent", headers=lead["h"]).get_json()["data"]
    assert ann_id in [a["id"] for a in items]
    assert api.post(f"/api/v1/announcements/{ann_id}/read", headers=lead["h"]).status_code == 200
    assert api.post(f"/api/v1/announcements/{ann_id}/read", headers=lead["h"]).status_code == 200  # idempotent
    after = {a["id"]: a for a in api.get("/api/v1/announcements", headers=lead["h"]).get_json()["data"]}
    assert after[ann_id]["is_read"] is True
    assert api.delete(f"/api/v1/announcements/{ann_id}/read", headers=lead["h"]).status_code == 200
    assert api.post("/api/v1/announcements/read-all", headers=lead["h"]).status_code == 200
    assert api.post("/api/v1/announcements/nope/read", headers=lead["h"]).status_code == 404


def test_logout_revocation_is_persisted(pg_app, api):
    user = _signup(api, "Soon Gone", "gone@pg.example.edu")
    assert api.get("/api/v1/auth/me", headers=user["h"]).status_code == 200
    assert api.post("/api/v1/auth/logout", headers=user["h"]).status_code == 200
    assert api.get("/api/v1/auth/me", headers=user["h"]).status_code == 401
    assert pg_app.repositories["token_revocation"].purge_expired_tokens() == 0  # unexpired entry retained


def test_leave_disband_and_leadership_rules(api, world):
    mate, lead = world["mate"], world["lead"]
    me = api.get("/api/v1/teams/me", headers=lead["h"]).get_json()["data"]
    tid = me["id"]
    assert api.post("/api/v1/teams/leave", headers=lead["h"]).status_code == 400  # leader of multi-member team
    assert api.post(f"/api/v1/teams/{tid}/transfer-leadership", headers=lead["h"], json={"new_leader_id": mate["id"]}).status_code == 200
    assert api.post("/api/v1/teams/leave", headers=lead["h"]).status_code == 200
    gone = api.get("/api/v1/teams/me", headers=lead["h"])
    assert gone.status_code == 404 and gone.get_json()["error"]["code"] == "RESOURCE_NOT_FOUND"
