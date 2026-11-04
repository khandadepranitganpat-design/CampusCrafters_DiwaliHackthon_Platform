"""CampusCrafters Announcement Repository Interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class IAnnouncementRepository(ABC):
    """Abstract repository for Announcements and Read Status Tracking."""

    @abstractmethod
    def list_all(self, category: Optional[str] = None, priority: Optional[str] = None) -> List[Dict[str, Any]]:
        """List announcements with optional category and priority filters."""
        pass

    @abstractmethod
    def get_by_id(self, announcement_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single announcement by ID."""
        pass

    @abstractmethod
    def create_announcement(self, announcement_data: Dict[str, Any]) -> Dict[str, Any]:
        """Broadcast a new announcement."""
        pass

    @abstractmethod
    def get_read_ids_for_user(self, user_id: str) -> List[str]:
        """Retrieve list of announcement IDs marked as read by user."""
        pass

    @abstractmethod
    def mark_read(self, user_id: str, announcement_id: str) -> bool:
        """Record an announcement as read by user."""
        pass

    @abstractmethod
    def mark_unread(self, user_id: str, announcement_id: str) -> bool:
        """Mark an announcement as unread for user."""
        pass

    @abstractmethod
    def mark_all_read(self, user_id: str) -> bool:
        """Mark all existing announcements as read for user."""
        pass

