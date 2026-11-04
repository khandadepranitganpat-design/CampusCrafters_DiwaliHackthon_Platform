"""CampusCrafters Authentication Service."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from werkzeug.security import check_password_hash, generate_password_hash

from app.errors.exceptions import (
    AuthenticationError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from app.repositories.interfaces.user_repository import IUserRepository
from app.repositories.interfaces.token_revocation_repository import ITokenRevocationRepository
from app.repositories.interfaces.registration_repository import IRegistrationRepository
from app.repositories.interfaces.team_repository import ITeamRepository
from app.security.jwt_utils import generate_token
from app.utils.helpers import generate_id, utc_now


class AuthService:
    """Encapsulates authentication, identity provisioning, and token lifecycle."""

    def __init__(
        self,
        user_repo: IUserRepository,
        token_repo: ITokenRevocationRepository,
        reg_repo: IRegistrationRepository,
        team_repo: ITeamRepository,
    ):
        self.user_repo = user_repo
        self.token_repo = token_repo
        self.reg_repo = reg_repo
        self.team_repo = team_repo

    def dev_login(self, email: str, password: str) -> Dict[str, Any]:
        """Development password-based login for offline testing."""
        user = self.user_repo.get_by_email(email)
        if not user:
            raise AuthenticationError("Invalid email or password.")

        # Check password (accept plain text in dev mock accounts or hashed)
        stored_password = user.get("password") or user.get("password_hash")
        password_valid = False
        if stored_password:
            if stored_password.startswith("pbkdf2:") or stored_password.startswith("scrypt:"):
                password_valid = check_password_hash(stored_password, password)
            else:
                password_valid = stored_password == password

        if not password_valid:
            raise AuthenticationError("Invalid email or password.")

        reg = self.reg_repo.get_by_user_id(user["id"])
        is_registered = reg is not None and reg.get("status") == "confirmed"

        token_data = generate_token(user["id"], user.get("roles", ["participant"]))

        return {
            "access_token": token_data["access_token"],
            "token_type": "Bearer",
            "expires_in": token_data["expires_in"],
            "user": {
                "id": user["id"],
                "display_name": user.get("display_name", ""),
                "email": user.get("email", ""),
                "college": user.get("college", ""),
                "visitor_state": "registered" if is_registered else "logged_in_unregistered",
                "is_registered": is_registered,
            },
        }

    def dev_signup(self, signup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Development user registration for offline testing."""
        if signup_data.get("password") != signup_data.get("confirm_password"):
            raise ValidationError("Passwords do not match.", field="confirm_password")

        existing = self.user_repo.get_by_email(signup_data["email"])
        if existing:
            raise ConflictError("A user with this email address already exists.", error_code="USER_ALREADY_EXISTS")

        user_id = generate_id("u-")
        user_record = {
            "id": user_id,
            "display_name": signup_data["full_name"],
            "email": signup_data["email"].strip().lower(),
            "college": signup_data["college"],
            "course": signup_data.get("course"),
            "year": signup_data.get("year"),
            "phone": signup_data.get("phone"),
            "password_hash": generate_password_hash(signup_data["password"]),
            "roles": ["participant"],
            "skills": [],
            "bio": "",
        }
        created_user = self.user_repo.create_user(user_record)

        token_data = generate_token(created_user["id"], ["participant"])

        return {
            "access_token": token_data["access_token"],
            "token_type": "Bearer",
            "expires_in": token_data["expires_in"],
            "user": {
                "id": created_user["id"],
                "display_name": created_user["display_name"],
                "email": created_user["email"],
                "college": created_user["college"],
                "visitor_state": "logged_in_unregistered",
                "is_registered": False,
            },
        }

    def sso_login_from_claims(self, claims: Dict[str, Any]) -> Dict[str, Any]:
        """Provision or resolve the local user for verified SSO claims and issue a platform token.

        Roles are never taken from the identity provider: new users are always plain
        participants and existing users keep the roles stored locally.
        """
        email = claims["email"].strip().lower()
        user = self.user_repo.get_by_email(email)
        if not user:
            user = self.user_repo.create_user({
                "id": generate_id("u-"),
                "display_name": (claims.get("name") or email.split("@")[0])[:128],
                "email": email,
                "college": (claims.get("college") or claims.get("organization") or "")[:255],
                "roles": ["participant"],
                "skills": [],
                "bio": "",
            })

        reg = self.reg_repo.get_by_user_id(user["id"])
        is_registered = reg is not None and reg.get("status") == "confirmed"
        token_data = generate_token(user["id"], user.get("roles", ["participant"]))

        return {
            "access_token": token_data["access_token"],
            "token_type": "Bearer",
            "expires_in": token_data["expires_in"],
            "user": {
                "id": user["id"],
                "display_name": user["display_name"],
                "email": user["email"],
                "college": user.get("college", ""),
                "visitor_state": "registered" if is_registered else "logged_in_unregistered",
                "is_registered": is_registered,
            },
        }

    def get_current_user_context(self, user_id: str) -> Dict[str, Any]:
        """Retrieve full context for active authenticated session."""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found.")

        reg = self.reg_repo.get_by_user_id(user_id)
        is_registered = reg is not None and reg.get("status") == "confirmed"

        team = self.team_repo.get_by_user_id(user_id)
        team_id = team["id"] if team else None
        is_team_leader = team["leader_id"] == user_id if team else False

        return {
            "id": user["id"],
            "display_name": user.get("display_name", ""),
            "email": user.get("email", ""),
            "college": user.get("college", ""),
            "visitor_state": "registered" if is_registered else "logged_in_unregistered",
            "is_registered": is_registered,
            "team_id": team_id,
            "is_team_leader": is_team_leader,
            "roles": user.get("roles", ["participant"]),
        }

    def logout(self, jti: str, user_id: str, exp_timestamp: Optional[int]) -> bool:
        """Revoke active JWT by recording jti in revocation repository."""
        if not jti:
            return False
        expires_at = (
            datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
            if exp_timestamp
            else datetime.now(timezone.utc)
        )
        return self.token_repo.revoke_token(jti, user_id, expires_at)

