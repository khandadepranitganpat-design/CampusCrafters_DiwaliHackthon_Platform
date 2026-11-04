"""CampusCrafters Pytest Configuration & Test Fixtures."""

import pytest
from app import create_app


@pytest.fixture
def app():
    """Create test application instance with testing configuration."""
    test_app = create_app("testing")
    yield test_app


@pytest.fixture
def client(app):
    """Test HTTP client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Test CLI runner."""
    return app.test_cli_runner()


@pytest.fixture
def auth_headers(client):
    """Generate Bearer auth header using seeded participant account p-001."""
    resp = client.post(
        "/api/v1/auth/dev/login",
        json={"email": "arjun.m@student.example.edu", "password": "Hackathon2026!"},
    )
    data = resp.get_json()
    token = data["data"]["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


@pytest.fixture
def admin_auth_headers(client):
    """Generate Bearer auth header using seeded admin account u-admin-01."""
    resp = client.post(
        "/api/v1/auth/dev/login",
        json={"email": "admin@campuscrafters.com", "password": "AdminHackathon2026!"},
    )
    data = resp.get_json()
    token = data["data"]["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

