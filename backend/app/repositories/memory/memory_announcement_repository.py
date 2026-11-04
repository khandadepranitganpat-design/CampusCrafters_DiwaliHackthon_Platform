"""CampusCrafters Thread-safe In-Memory Announcement Repository."""

import threading
from typing import Any, Dict, List, Optional, Set
from app.repositories.interfaces.announcement_repository import IAnnouncementRepository
from app.repositories.memory.seed_data import DEV_ANNOUNCEMENTS
from app.utils.helpers import utc_now, generate_id


class MemoryAnnouncementRepository(IAnnouncementRepository):
    """Thread-safe in-memory adapter for announcements and read status."""

    def __init__(self, seed: bool = True):
        self._lock = threading.RLock()
        self._announcements: Dict[str, Dict[str, Any]] = {}
        self._reads_by_user: Dict[str, Set[str]] = {}

        if seed:
            for a in DEV_ANNOUNCEMENTS:
                self._announcements[a["id"]] = dict(a)

    def list_all(self, category: Optional[str] = None, priority: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            result = []
            for a in self._announcements.values():
                if category and a.get("category") != category:
                    continue
                if priority and a.get("priority") != priority:
                    continue
                result.append(dict(a))
            # Sort newest first
            result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return result

    def get_by_id(self, announcement_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            a = self._announcements.get(announcement_id)
            return dict(a) if a else None

    def create_announcement(self, announcement_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            ann_id = announcement_data.get("id") or generate_id("ann-")
            record = {
                "id": ann_id,
                "title": announcement_data["title"],
                "message": announcement_data["message"],
                "category": announcement_data["category"],
                "priority": announcement_data.get("priority", "normal"),
                "created_at": utc_now(),
            }
            self._announcements[ann_id] = record
            return dict(record)

    def get_read_ids_for_user(self, user_id: str) -> List[str]:
        with self._lock:
            return list(self._reads_by_user.get(user_id, set()))

    def mark_read(self, user_id: str, announcement_id: str) -> bool:
        with self._lock:
            if announcement_id not in self._announcements:
                return False
            reads = self._reads_by_user.setdefault(user_id, set())
            reads.add(announcement_id)
            return True

    def mark_unread(self, user_id: str, announcement_id: str) -> bool:
        with self._lock:
            reads = self._reads_by_user.get(user_id)
            if reads and announcement_id in reads:
                reads.remove(announcement_id)
                return True
            return False

    def mark_all_read(self, user_id: str) -> bool:
        with self._lock:
            reads = self._reads_by_user.setdefault(user_id, set())
            for ann_id in self._announcements.keys():
                reads.add(ann_id)
            return True

