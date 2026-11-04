"""Campus Crafter SSO (OAuth 2.0 Authorization Code + PKCE, OpenID Connect) client.

Security properties (see docs/API_CONTRACT.md section 3.B):
  * CSRF: a random ``state`` is bound to the browser in a signed, HttpOnly cookie and compared
    (constant time) with the value returned to the callback.
  * Replay: a random ``nonce`` is sent in the authorization request and must match the ID token.
  * PKCE: ``code_verifier`` lives only in the signed cookie; only its S256 challenge is public.
  * The authorization code is exchanged server-side; the client secret never reaches the browser.
  * ID tokens are verified against the provider JWKS (signature, ``iss``, ``aud``, ``exp``, ``nbf``).
The provider itself is configured purely through environment variables; with none set, every
SSO entry point fails closed with 503 SSO_NOT_CONFIGURED.
"""

import base64
import hashlib
import hmac
import secrets
import time
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import jwt
import requests
from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.errors.exceptions import (
    AuthenticationError,
    InvalidStateError,
    SSONotConfiguredError,
    SSOProviderError,
)

SSO_COOKIE_NAME = "cc_sso_flow"
_DISCOVERY_TTL_SECONDS = 3600
_HTTP_TIMEOUT_SECONDS = 10
_ALLOWED_ID_TOKEN_ALGS = ["RS256", "RS384", "RS512", "ES256", "ES384", "PS256"]


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="campus-crafter-sso-flow")


def _pkce_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


class SSOClient:
    """Stateless-per-request OIDC relying party; discovery and JWKS are cached per process."""

    def __init__(self) -> None:
        self._discovery: Optional[Dict[str, Any]] = None
        self._discovery_fetched_at: float = 0.0
        self._jwks_client: Optional[jwt.PyJWKClient] = None
        self._jwks_uri: Optional[str] = None

    # -- configuration ---------------------------------------------------------------------
    @staticmethod
    def _cfg(key: str) -> Optional[str]:
        return current_app.config.get(key)

    def is_configured(self) -> bool:
        return all(self._cfg(k) for k in ("SSO_CLIENT_ID", "SSO_CLIENT_SECRET", "SSO_DISCOVERY_URL"))

    def _require_configured(self) -> None:
        if not self.is_configured():
            raise SSONotConfiguredError()

    def _discovery_doc(self) -> Dict[str, Any]:
        now = time.time()
        if self._discovery and now - self._discovery_fetched_at < _DISCOVERY_TTL_SECONDS:
            return self._discovery
        try:
            resp = requests.get(self._cfg("SSO_DISCOVERY_URL"), timeout=_HTTP_TIMEOUT_SECONDS)
            resp.raise_for_status()
            doc = resp.json()
            for key in ("issuer", "authorization_endpoint", "token_endpoint", "jwks_uri"):
                if key not in doc:
                    raise ValueError(f"discovery document missing '{key}'")
        except (requests.RequestException, ValueError) as exc:
            current_app.logger.error("SSO discovery failed: %s", exc)
            raise SSOProviderError("Could not load SSO provider configuration.") from exc
        self._discovery, self._discovery_fetched_at = doc, now
        return doc

    def _jwks(self, jwks_uri: str) -> jwt.PyJWKClient:
        if self._jwks_client is None or self._jwks_uri != jwks_uri:
            self._jwks_client = jwt.PyJWKClient(jwks_uri, cache_keys=True, lifespan=3600, timeout=_HTTP_TIMEOUT_SECONDS)
            self._jwks_uri = jwks_uri
        return self._jwks_client

    # -- step 1: begin ---------------------------------------------------------------------
    def begin_login(self) -> Dict[str, str]:
        """Create flow secrets; returns the authorization URL and the signed cookie payload."""
        self._require_configured()
        doc = self._discovery_doc()
        state = secrets.token_urlsafe(32)
        nonce = secrets.token_urlsafe(32)
        verifier = secrets.token_urlsafe(64)
        params = {
            "response_type": "code",
            "client_id": self._cfg("SSO_CLIENT_ID"),
            "redirect_uri": self._cfg("SSO_REDIRECT_URI"),
            "scope": "openid email profile",
            "state": state,
            "nonce": nonce,
            "code_challenge": _pkce_challenge(verifier),
            "code_challenge_method": "S256",
        }
        cookie_value = _serializer().dumps({"state": state, "nonce": nonce, "verifier": verifier})
        return {
            "authorization_url": f"{doc['authorization_endpoint']}?{urlencode(params)}",
            "state": state,
            "cookie_value": cookie_value,
        }

    # -- step 2: callback ------------------------------------------------------------------
    def _read_flow_cookie(self, cookie_value: Optional[str]) -> Dict[str, str]:
        if not cookie_value:
            raise InvalidStateError("SSO session cookie is missing or expired. Please restart sign-in.")
        try:
            return _serializer().loads(cookie_value, max_age=int(self._cfg("SSO_STATE_TTL_SECONDS") or 600))
        except (BadSignature, SignatureExpired):
            raise InvalidStateError("SSO session cookie is invalid or expired. Please restart sign-in.")

    def complete_login(self, code: str, state: str, redirect_uri: str, cookie_value: Optional[str]) -> Dict[str, Any]:
        """Verify state, exchange the code, validate the ID token; returns verified identity claims."""
        self._require_configured()
        flow = self._read_flow_cookie(cookie_value)
        if not hmac.compare_digest(flow["state"].encode(), state.encode()):
            raise InvalidStateError("OAuth state parameter mismatch.")
        if redirect_uri != self._cfg("SSO_REDIRECT_URI"):
            raise InvalidStateError("redirect_uri does not match the registered callback URL.")

        doc = self._discovery_doc()
        try:
            token_resp = requests.post(
                doc["token_endpoint"],
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": self._cfg("SSO_CLIENT_ID"),
                    "client_secret": self._cfg("SSO_CLIENT_SECRET"),
                    "code_verifier": flow["verifier"],
                },
                headers={"Accept": "application/json"},
                timeout=_HTTP_TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            current_app.logger.error("SSO token exchange transport error: %s", exc)
            raise SSOProviderError("Could not reach the SSO token endpoint.") from exc

        if token_resp.status_code in (400, 401):
            raise AuthenticationError("SSO authorization code was rejected. Please sign in again.")
        if not token_resp.ok:
            current_app.logger.error("SSO token endpoint returned HTTP %s", token_resp.status_code)
            raise SSOProviderError()
        id_token = (token_resp.json() or {}).get("id_token")
        if not id_token:
            raise AuthenticationError("SSO provider did not return an ID token.")

        return self._verify_id_token(id_token, doc, flow["nonce"])

    def _verify_id_token(self, id_token: str, doc: Dict[str, Any], expected_nonce: str) -> Dict[str, Any]:
        try:
            signing_key = self._jwks(doc["jwks_uri"]).get_signing_key_from_jwt(id_token)
            claims = jwt.decode(
                id_token,
                signing_key.key,
                algorithms=_ALLOWED_ID_TOKEN_ALGS,
                audience=self._cfg("SSO_CLIENT_ID"),
                issuer=doc["issuer"],
                leeway=60,
                options={"require": ["exp", "iss", "aud", "sub"]},
            )
        except jwt.PyJWKClientError as exc:
            current_app.logger.error("SSO JWKS lookup failed: %s", exc)
            raise SSOProviderError("Could not verify the SSO signing keys.") from exc
        except jwt.InvalidTokenError as exc:
            current_app.logger.warning("SSO ID token rejected: %s", exc)
            raise AuthenticationError("SSO ID token failed verification.") from exc

        if not hmac.compare_digest(str(claims.get("nonce", "")).encode(), expected_nonce.encode()):
            raise AuthenticationError("SSO ID token nonce mismatch.")
        if not claims.get("email"):
            raise AuthenticationError("SSO identity did not include an email address.")
        if claims.get("email_verified") is False:
            raise AuthenticationError("SSO email address is not verified.")
        return claims


sso_client = SSOClient()
