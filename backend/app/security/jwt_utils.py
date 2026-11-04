"""CampusCrafters JWT Authentication Utilities."""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
import jwt
from flask import current_app

from app.errors.exceptions import AuthenticationError


def generate_token(user_id: str, roles: Optional[List[str]] = None) -> Dict[str, Any]:
    """Generate a signed JWT Bearer access token."""
    now = datetime.now(timezone.utc)
    exp_seconds = current_app.config.get("JWT_EXPIRATION_SECONDS", 86400)
    secret = current_app.config["JWT_SECRET_KEY"]
    jti = str(uuid.uuid4())

    payload = {
        "jti": jti,
        "sub": user_id,
        "roles": roles or ["participant"],
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=exp_seconds)).timestamp()),
    }

    token = jwt.encode(payload, secret, algorithm="HS256")

    return {
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": exp_seconds,
        "jti": jti,
    }


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and verify a signed JWT Bearer access token."""
    secret = current_app.config["JWT_SECRET_KEY"]
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Authentication token has expired.")
    except jwt.InvalidTokenError:
        raise AuthenticationError("Invalid or malformed authentication token.")

