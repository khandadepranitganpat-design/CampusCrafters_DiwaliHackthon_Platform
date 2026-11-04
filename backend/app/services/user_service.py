"""CampusCrafters User & Profile Service."""

from typing import Any, Dict
from app.errors.exceptions import NotFoundError
from app.repositories.interfaces.user_repository import IUserRepository
from app.repositories.interfaces.registration_repository import IRegistrationRepository
from app.repositories.interfaces.track_repository import ITrackRepository


class UserService:
    """Encapsulates user profile retrieval and updates."""

    def __init__(
        self,
        user_repo: IUserRepository,
        reg_repo: IRegistrationRepository,
        track_repo: ITrackRepository,
    ):
        self.user_repo = user_repo
        self.reg_repo = reg_repo
        self.track_repo = track_repo

    def get_profile(self, user_id: str) -> Dict[str, Any]:
        """Get full profile details for user."""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found.")

        reg = self.reg_repo.get_by_user_id(user_id)
        track_id = reg.get("track_id") if reg else None
        track_title = None
        if track_id:
            track = self.track_repo.get_by_id(track_id)
            track_title = track.get("name") if track else None

        display_name = user.get("display_name", "")
        initials = "".join([part[0].upper() for part in display_name.split() if part])[:2] or "U"

        return {
            "id": user["id"],
            "display_name": display_name,
            "email": user.get("email", ""),
            "college": user.get("college", ""),
            "course": user.get("course"),
            "year": user.get("year"),
            "bio": user.get("bio", ""),
            "skills": user.get("skills", []),
            "track_id": track_id,
            "track_title": track_title,
            "registration_id": reg.get("id") if reg else None,
            "ticket_code": reg.get("ticket_code") if reg else None,
            "avatar_initials": initials,
            "avatar_color": "#2B50FF",
        }

    def update_profile(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update editable profile fields."""
        updated = self.user_repo.update_user(user_id, updates)
        if not updated:
            raise NotFoundError("User not found.")
        return self.get_profile(user_id)

