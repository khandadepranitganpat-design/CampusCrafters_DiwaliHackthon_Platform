"""CampusCrafters Registration Service."""

from typing import Any, Dict
from app.errors.exceptions import (
    ConflictError,
    EventStateLockedError,
    NotFoundError,
    UserAlreadyRegisteredError,
)
from app.repositories.interfaces.registration_repository import IRegistrationRepository
from app.repositories.interfaces.user_repository import IUserRepository
from app.repositories.interfaces.event_config_repository import IEventConfigRepository
from app.repositories.interfaces.track_repository import ITrackRepository


class RegistrationService:
    """Encapsulates event registration, ticket pass generation, and waitlist handling."""

    def __init__(
        self,
        reg_repo: IRegistrationRepository,
        user_repo: IUserRepository,
        config_repo: IEventConfigRepository,
        track_repo: ITrackRepository,
    ):
        self.reg_repo = reg_repo
        self.user_repo = user_repo
        self.config_repo = config_repo
        self.track_repo = track_repo

    def submit_registration(self, user_id: str, reg_data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit full hackathon registration."""
        # Check event lifecycle state
        config = self.config_repo.get_config()
        current_state = config.get("event_state", "reg_open")
        if current_state not in ("reg_open", "almost_full"):
            raise EventStateLockedError(
                f"Registration is not accepted during current event state: '{current_state}'."
            )

        # Check existing registration
        existing = self.reg_repo.get_by_user_id(user_id)
        if existing:
            raise UserAlreadyRegisteredError("You are already registered for this hackathon.")

        # Check track existence
        track_id = reg_data.get("track_id", "")
        track = self.track_repo.get_by_id(track_id)
        if not track:
            raise NotFoundError(f"Selected track '{track_id}' does not exist.")

        # Update user profile with latest details
        self.user_repo.update_user(
            user_id,
            {
                "display_name": reg_data["full_name"],
                "college": reg_data["college"],
                "course": reg_data.get("course"),
                "year": reg_data.get("year"),
                "phone": reg_data.get("phone"),
                "skills": reg_data.get("skills", []),
                "bio": reg_data.get("bio", ""),
            },
        )

        # Create registration
        record_data = {
            "user_id": user_id,
            "track_id": track_id,
            "experience": reg_data["experience"],
            "interests": reg_data.get("interests", []),
            "rules_accepted": reg_data.get("rules_accepted", True),
            "status": "confirmed",
        }
        created = self.reg_repo.create_registration(record_data)

        return {
            "id": created["id"],
            "user_id": created["user_id"],
            "ticket_code": created["ticket_code"],
            "status": created["status"],
            "registered_at": created["registered_at"],
        }

    def get_user_registration(self, user_id: str) -> Dict[str, Any]:
        """Retrieve confirmed registration ticket pass for user."""
        reg = self.reg_repo.get_by_user_id(user_id)
        if not reg:
            raise NotFoundError("Registration record not found for this user.")
        return reg

    def submit_waitlist(self, waitlist_data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit waitlist entry when the event state is full."""
        config = self.config_repo.get_config()
        current_state = config.get("event_state", "reg_open")
        if current_state != "full":
            raise EventStateLockedError(
                f"Waitlist is only active when event state is 'full'. Current state: '{current_state}'."
            )

        created = self.reg_repo.create_waitlist_entry(waitlist_data)
        return {
            "id": created["id"],
            "full_name": created["full_name"],
            "email": created["email"],
            "status": created["status"],
            "submitted_at": created["submitted_at"],
        }

