"""CampusCrafters Security & Authorization Decorators."""

from functools import wraps
from typing import Any, Callable, List
from flask import request, g

from app.errors.exceptions import (
    AuthenticationError,
    AuthorizationError,
    RegistrationRequiredError,
    NotFoundError,
)
from app.security.jwt_utils import decode_token


def _authenticate_bearer(auth_header: str) -> None:
    """Validate a Bearer header, enforce server-side revocation, and populate flask.g."""
    if not auth_header or not auth_header.startswith("Bearer "):
        raise AuthenticationError("Missing or malformed Authorization header. Expected 'Bearer <token>'.")

    token = auth_header[7:].strip()
    payload = decode_token(token)

    # Check server-side token revocation
    token_repo = getattr(g, "token_revocation_repo", None)
    jti = payload.get("jti")
    if token_repo and jti and token_repo.is_token_revoked(jti):
        raise AuthenticationError("Session token has been revoked. Please sign in again.")

    g.current_user_id = payload.get("sub")
    g.current_user_roles = payload.get("roles", ["participant"])
    g.token_jti = jti
    g.token_exp = payload.get("exp")


def require_auth(f: Callable) -> Callable:
    """Validate Bearer JWT and check server-side token revocation."""

    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        _authenticate_bearer(request.headers.get("Authorization", ""))
        return f(*args, **kwargs)

    return decorated_function


def optional_auth(f: Callable) -> Callable:
    """Identify the caller when a valid Bearer token is sent; otherwise continue anonymously.

    A missing, expired, malformed or revoked token never blocks a public endpoint.
    """

    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        header = request.headers.get("Authorization", "")
        if header:
            try:
                _authenticate_bearer(header)
            except AuthenticationError:
                pass
        return f(*args, **kwargs)

    return decorated_function


def require_role(*required_roles: str) -> Callable:
    """Ensure authenticated user holds at least one required role."""

    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args: Any, **kwargs: Any) -> Any:
            roles: List[str] = getattr(g, "current_user_roles", [])
            if not any(role in roles for role in required_roles):
                raise AuthorizationError(
                    f"Forbidden. Required one of roles: {', '.join(required_roles)}. Current roles: {', '.join(roles)}."
                )
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def require_team_leader(f: Callable) -> Callable:
    """Ensure authenticated user is the designated leader of the team in the URL route."""

    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        team_id = kwargs.get("id") or kwargs.get("team_id")
        if not team_id:
            raise AuthorizationError("Team context missing from request route.")

        team_repo = getattr(g, "team_repo", None)
        if not team_repo:
            raise AuthorizationError("Team repository unavailable.")

        team = team_repo.get_by_id(team_id)
        if not team:
            raise NotFoundError(f"Team '{team_id}' not found.")

        current_user_id = getattr(g, "current_user_id", None)
        if team.get("leader_id") != current_user_id:
            raise AuthorizationError("Only the designated team leader can perform this operation.")

        g.current_team = team
        return f(*args, **kwargs)

    return decorated_function


def require_registered(f: Callable) -> Callable:
    """Ensure authenticated user is officially registered for the hackathon."""

    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        current_user_id = getattr(g, "current_user_id", None)
        if not current_user_id:
            raise AuthenticationError("Authentication required.")

        reg_repo = getattr(g, "registration_repo", None)
        if not reg_repo:
            raise AuthorizationError("Registration repository unavailable.")

        reg = reg_repo.get_by_user_id(current_user_id)
        if not reg or reg.get("status") != "confirmed":
            raise RegistrationRequiredError("You must complete hackathon registration before accessing this feature.")

        g.current_registration = reg
        return f(*args, **kwargs)

    return decorated_function



def require_team_member_or_staff(f: Callable) -> Callable:
    """Allow team members of the team in the URL, or judges/admins; everyone else gets 403."""

    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        team_id = kwargs.get("id") or kwargs.get("team_id")
        team_repo = getattr(g, "team_repo", None)
        team = team_repo.get_by_id(team_id) if (team_repo and team_id) else None
        if not team:
            raise NotFoundError(f"Team '{team_id}' not found.")

        roles = getattr(g, "current_user_roles", [])
        is_staff = any(r in roles for r in ("judge", "admin"))
        is_member = getattr(g, "current_user_id", None) in team.get("member_ids", [])
        if not (is_member or is_staff):
            raise AuthorizationError("Only members of this team can access its workspace data.")

        g.current_team = team
        return f(*args, **kwargs)

    return decorated_function
