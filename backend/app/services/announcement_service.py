"""CampusCrafters Announcement Service."""

from typing import Any, Dict, List, Optional
from app.errors.exceptions import NotFoundError
from app.repositories.interfaces.announcement_repository import IAnnouncementRepository


class AnnouncementService:
    """Encapsulates announcement broadcasts and per-user read tracking."""

    def __init__(self, announcement_repo: IAnnouncementRepository):
        self.announcement_repo = announcement_repo

    def list_announcements(
        self,
        user_id: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """List announcements with read flags for user."""
        announcements = self.announcement_repo.list_all(category=category, priority=priority)
        read_ids = set(self.announcement_repo.get_read_ids_for_user(user_id)) if user_id else set()

        result = []
        for a in announcements:
            result.append({
                "id": a["id"],
                "title": a["title"],
                "message": a["message"],
                "category": a["category"],
                "priority": a.get("priority", "normal"),
                "timestamp": a.get("created_at"),
                "is_read": a["id"] in read_ids,
            })
        return result

    def mark_read(self, user_id: str, announcement_id: str) -> Dict[str, Any]:
        """Mark single announcement as read."""
        a = self.announcement_repo.get_by_id(announcement_id)
        if not a:
            raise NotFoundError(f"Announcement '{announcement_id}' not found.")
        self.announcement_repo.mark_read(user_id, announcement_id)
        return {"id": announcement_id, "is_read": True}

    def mark_unread(self, user_id: str, announcement_id: str) -> Dict[str, Any]:
        """Mark single announcement as unread."""
        a = self.announcement_repo.get_by_id(announcement_id)
        if not a:
            raise NotFoundError(f"Announcement '{announcement_id}' not found.")
        self.announcement_repo.mark_unread(user_id, announcement_id)
        return {"id": announcement_id, "is_read": False}

    def mark_all_read(self, user_id: str) -> Dict[str, Any]:
        """Mark all announcements read for user."""
        self.announcement_repo.mark_all_read(user_id)
        return {"unread_count": 0}

    def create_announcement(self, announcement_data: Dict[str, Any]) -> Dict[str, Any]:
        """Broadcast announcement (Admin action)."""
        return self.announcement_repo.create_announcement(announcement_data)

