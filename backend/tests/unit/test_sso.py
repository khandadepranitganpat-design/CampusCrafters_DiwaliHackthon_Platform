"""SSO (OIDC code + PKCE) flow tests against a mocked identity provider with a real RSA key."""

import time
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app import create_app
from app.security import sso as sso_module

ISSUER = "https://sso.campuscrafters.test"
CLIENT_ID = "hackathon-client"
REDIRECT = "https://campuscrafters.test/auth/callback"

_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


class FakeResponse:
    def __init__(self, status=200, payload=None):
        self.status_code = status
        self._payload = payload or {}
        self.ok = 200 <= status < 300

    def json(self):
        return self._payload

    def raise_for_status(self):
        if not self.ok:
            raise sso_module.requests.HTTPError(str(self.status_code))


@pytest.fixture
def sso_app(monkeypatch):
    from app.config import TestingConfig

    monkeypatch.setattr(TestingConfig, "SSO_CLIENT_ID", CLIENT_ID, raising=False)
    monkeypatch.setattr(TestingConfig, "SSO_CLIENT_SECRET", "s3cret", raising=False)
    monkeypatch.setattr(TestingConfig, "SSO_DISCOVERY_URL", f"{ISSUER}/.well-known/openid-configuration", raising=False)
    monkeypatch.setattr(TestingConfig, "SSO_REDIRECT_URI", REDIRECT, raising=False)

    # Fresh client so cached discovery/JWKS from other tests cannot leak in.
    fresh = sso_module.SSOClient()
    monkeypatch.setattr(sso_module, "sso_client", fresh)
    import app.api.auth.routes as auth_routes

    monkeypatch.setattr(auth_routes, "sso_client", fresh)

    discovery = {
        "issuer": ISSUER,
        "authorization_endpoint": f"{ISSUER}/authorize",
        "token_endpoint": f"{ISSUER}/token",
        "jwks_uri": f"{ISSUER}/jwks",
    }
    monkeypatch.setattr(sso_module.requests, "get", lambda url, **kw: FakeResponse(200, discovery))
    monkeypatch.setattr(
        fresh, "_jwks", lambda uri: SimpleNamespace(get_signing_key_from_jwt=lambda tok: SimpleNamespace(key=_KEY.public_key()))
    )
    app = create_app("testing")
    return app, fresh


def _id_token(nonce, **overrides):
    now = int(time.time())
    claims = {
        "iss": ISSUER, "aud": CLIENT_ID, "sub": "ext-123", "iat": now, "exp": now + 300,
        "nonce": nonce, "email": "New.Student@College.edu", "email_verified": True, "name": "New Student",
    }
    claims.update(overrides)
    return jwt.encode(claims, _KEY, algorithm="RS256")


def _begin(client):
    resp = client.get("/api/v1/auth/sso/login")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    query = parse_qs(urlparse(data["authorization_url"]).query)
    return data["state"], query


def _callback(client, monkeypatch, state, id_token_factory, token_status=200, redirect=REDIRECT):
    captured = {}

    def fake_post(url, data=None, **kw):
        captured["data"] = data
        if token_status != 200:
            return FakeResponse(token_status, {"error": "invalid_grant"})
        return FakeResponse(200, {"id_token": id_token_factory(captured)})

    monkeypatch.setattr(sso_module.requests, "post", fake_post)
    resp = client.post("/api/v1/auth/sso/callback", json={"code": "abc", "state": state, "redirect_uri": redirect})
    return resp, captured


def test_sso_unconfigured_fails_closed(client):
    resp = client.get("/api/v1/auth/sso/login")
    assert resp.status_code == 503
    assert resp.get_json()["error"]["code"] == "SSO_NOT_CONFIGURED"
    cb = client.post("/api/v1/auth/sso/callback", json={"code": "x", "state": "y", "redirect_uri": REDIRECT})
    assert cb.status_code == 503


def test_sso_full_flow_provisions_participant_and_issues_token(sso_app, monkeypatch):
    app, _ = sso_app
    client = app.test_client()
    state, query = _begin(client)
    assert query["code_challenge_method"] == ["S256"] and query["state"] == [state]
    nonce = query["nonce"][0]

    resp, captured = _callback(client, monkeypatch, state, lambda c: _id_token(nonce))
    assert resp.status_code == 200, resp.get_json()
    data = resp.get_json()["data"]
    assert data["user"]["email"] == "new.student@college.edu"
    assert data["user"]["visitor_state"] == "logged_in_unregistered"
    # PKCE verifier is sent to the provider and matches the public challenge
    assert sso_module._pkce_challenge(captured["data"]["code_verifier"]) == query["code_challenge"][0]

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"})
    assert me.status_code == 200 and me.get_json()["data"]["roles"] == ["participant"]


def test_sso_never_grants_roles_from_provider_claims(sso_app, monkeypatch):
    app, _ = sso_app
    client = app.test_client()
    state, query = _begin(client)
    resp, _ = _callback(client, monkeypatch, state, lambda c: _id_token(query["nonce"][0], roles=["admin"]))
    token = resp.get_json()["data"]["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert "admin" not in me.get_json()["data"]["roles"]


def test_sso_state_mismatch_rejected(sso_app, monkeypatch):
    app, _ = sso_app
    client = app.test_client()
    _begin(client)
    resp, _ = _callback(client, monkeypatch, "attacker-state", lambda c: _id_token("n"))
    assert resp.status_code == 400 and resp.get_json()["error"]["code"] == "INVALID_STATE"


def test_sso_callback_without_flow_cookie_rejected(sso_app, monkeypatch):
    app, _ = sso_app
    fresh_browser = app.test_client()
    resp, _ = _callback(fresh_browser, monkeypatch, "any", lambda c: _id_token("n"))
    assert resp.status_code == 400 and resp.get_json()["error"]["code"] == "INVALID_STATE"


def test_sso_redirect_uri_must_match_registered(sso_app, monkeypatch):
    app, _ = sso_app
    client = app.test_client()
    state, _q = _begin(client)
    resp, _ = _callback(client, monkeypatch, state, lambda c: _id_token("n"), redirect="https://evil.example/cb")
    assert resp.status_code == 400


@pytest.mark.parametrize(
    "overrides",
    [{"aud": "someone-else"}, {"iss": "https://evil.example"}, {"exp": int(time.time()) - 3600}, {"nonce": "wrong"}, {"email_verified": False}],
)
def test_sso_bad_id_token_rejected(sso_app, monkeypatch, overrides):
    app, _ = sso_app
    client = app.test_client()
    state, query = _begin(client)
    nonce = query["nonce"][0]
    resp, _ = _callback(client, monkeypatch, state, lambda c: _id_token(overrides.get("nonce", nonce), **{k: v for k, v in overrides.items() if k != "nonce"}))
    assert resp.status_code == 401, resp.get_json()


def test_sso_id_token_signed_with_unknown_key_rejected(sso_app, monkeypatch):
    app, _ = sso_app
    client = app.test_client()
    state, query = _begin(client)
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = int(time.time())
    forged = jwt.encode(
        {"iss": ISSUER, "aud": CLIENT_ID, "sub": "x", "exp": now + 300, "nonce": query["nonce"][0], "email": "a@b.edu"},
        other, algorithm="RS256",
    )
    resp, _ = _callback(client, monkeypatch, state, lambda c: forged)
    assert resp.status_code == 401


def test_sso_provider_rejects_code(sso_app, monkeypatch):
    app, _ = sso_app
    client = app.test_client()
    state, _q = _begin(client)
    resp, _ = _callback(client, monkeypatch, state, lambda c: "", token_status=400)
    assert resp.status_code == 401
