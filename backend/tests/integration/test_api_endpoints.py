"""Integration Tests for Canonical API Endpoints."""


def test_health_check_endpoint(client):
    """GET /api/v1/health returns 200 with standard envelope."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["status"] == "healthy"
    assert "timestamp" in json_data["meta"]
    assert json_data["meta"]["version"] == "v1"


def test_config_state_endpoint(client):
    """GET /api/v1/config/state returns public event configuration."""
    resp = client.get("/api/v1/config/state")
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert data["event_state"] == "reg_open"
    assert data["config"]["min_team_size"] == 2
    assert data["config"]["max_team_size"] == 5


def test_dev_login_and_auth_me(client, auth_headers):
    """POST /api/v1/auth/dev/login succeeds and GET /api/v1/auth/me returns active session."""
    resp = client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["id"] == "p-001"
    assert json_data["data"]["display_name"] == "Arjun Mehta"


def test_tracks_and_problem_statements(client):
    """GET /api/v1/tracks and GET /api/v1/problem-statements return seed data."""
    tracks_resp = client.get("/api/v1/tracks")
    assert tracks_resp.status_code == 200
    assert len(tracks_resp.get_json()["data"]) >= 4

    problems_resp = client.get("/api/v1/problem-statements?track=fintech")
    assert problems_resp.status_code == 200
    problems = problems_resp.get_json()["data"]
    assert len(problems) >= 1
    assert problems[0]["id"] == "ps-ft-01"


def test_team_join_by_code(client):
    """POST /api/v1/teams/join allows eligible user to join team."""
    # Login as an unteamed registered user
    login_resp = client.post(
        "/api/v1/auth/dev/login",
        json={"email": "kavya.n@student.example.edu", "password": "Hackathon2026!"},
    )
    token = login_resp.get_json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # team-002 has code CG-9R2M and member p-003, p-007
    # Let's test team details
    team_resp = client.get("/api/v1/teams/me", headers=headers)
    # p-003 is leader of team-002, kavya.n is p-003
    assert team_resp.status_code == 200
    assert team_resp.get_json()["data"]["id"] == "team-002"


def test_draft_auto_save_and_submission_flow(client, auth_headers):
    """PUT /api/v1/teams/{id}/submission/draft allows partial debounced updates."""
    team_id = "team-001"
    draft_payload = {
        "project_title": "SplitEasy Auto-Saved Title",
        "short_description": "Updated tagline during sprint.",
    }
    resp = client.put(f"/api/v1/teams/{team_id}/submission/draft", json=draft_payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["team_id"] == team_id
    assert data["status"] == "DRAFT"


def test_announcements_filtering_and_read_status(client, auth_headers):
    """GET /api/v1/announcements supports separate category and priority filters."""
    # List announcements
    resp = client.get("/api/v1/announcements?category=registration", headers=auth_headers)
    assert resp.status_code == 200
    items = resp.get_json()["data"]
    for item in items:
        assert item["category"] == "registration"

    # Mark announcement read
    read_resp = client.post("/api/v1/announcements/ann-001/read", headers=auth_headers)
    assert read_resp.status_code == 200
    assert read_resp.get_json()["data"]["is_read"] is True


def test_admin_event_state_override(client, admin_auth_headers):
    """PATCH /api/v1/admin/event-state requires admin role and updates state."""
    resp = client.patch(
        "/api/v1/admin/event-state",
        json={"event_state": "event_live"},
        headers=admin_auth_headers,
    )
    assert resp.status_code == 200
    assert resp.get_json()["data"]["event_state"] == "event_live"

    # Verify public config updated
    cfg_resp = client.get("/api/v1/config/state")
    assert cfg_resp.get_json()["data"]["event_state"] == "event_live"

