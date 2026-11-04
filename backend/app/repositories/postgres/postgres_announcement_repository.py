"""CampusCrafters Concrete PostgreSQL Announcement Repository."""

from typing import Any, Dict, List, Optional

from app.repositories.interfaces.announcement_repository import IAnnouncementRepository
from app.repositories.postgres._common import normalize_timestamps
from app.repositories.postgres.db import PostgresDatabase
from app.utils.helpers import generate_id


class PostgresAnnouncementRepository(IAnnouncementRepository):
    """PostgreSQL adapter for announcements and announcement_reads."""

    def __init__(self, db: PostgresDatabase):
        self.db = db

    @staticmethod
    def _normalize(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        return normalize_timestamps(row, ("created_at",))

    def list_all(self, category: Optional[str] = None, priority: Optional[str] = None) -> List[Dict[str, Any]]:
        clauses, params = [], {}
        if category:
            clauses.append("category = :category")
            params["category"] = category
        if priority:
            clauses.append("priority = :priority")
            params["priority"] = priority
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = self.db.fetch_all(f"SELECT * FROM announcements {where} ORDER BY created_at DESC, id ASC;", params)
        return [self._normalize(r) for r in rows]

    def get_by_id(self, announcement_id: str) -> Optional[Dict[str, Any]]:
        return self._normalize(self.db.fetch_one("SELECT * FROM announcements WHERE id = :id;", {"id": announcement_id}))

    def create_announcement(self, announcement_data: Dict[str, Any]) -> Dict[str, Any]:
        row = self.db.fetch_one(
            """
            INSERT INTO announcements (id, title, message, category, priority, created_at)
            VALUES (:id, :title, :message, :category, :priority, NOW())
            RETURNING *;
            """,
            {
                "id": announcement_data.get("id") or generate_id("ann-"),
                "title": announcement_data["title"],
                "message": announcement_data["message"],
                "category": announcement_data["category"],
                "priority": announcement_data.get("priority", "normal"),
            },
        )
        return self._normalize(row)

    def get_read_ids_for_user(self, user_id: str) -> List[str]:
        rows = self.db.fetch_all(
            "SELECT announcement_id FROM announcement_reads WHERE user_id = :user_id;", {"user_id": user_id}
        )
        return [r["announcement_id"] for r in rows]

    def mark_read(self, user_id: str, announcement_id: str) -> bool:
        """Idempotent; returns False only if the announcement does not exist."""
        if not self.get_by_id(announcement_id):
            return False
        self.db.execute(
            """
            INSERT INTO announcement_reads (user_id, announcement_id, read_at)
            VALUES (:user_id, :aid, NOW())
            ON CONFLICT (user_id, announcement_id) DO NOTHING;
            """,
            {"user_id": user_id, "aid": announcement_id},
        )
        return True

    def mark_unread(self, user_id: str, announcement_id: str) -> bool:
        res = self.db.execute(
            "DELETE FROM announcement_reads WHERE user_id = :user_id AND announcement_id = :aid;",
            {"user_id": user_id, "aid": announcement_id},
        )
        return res.rowcount > 0

    def mark_all_read(self, user_id: str) -> bool:
        self.db.execute(
            """
            INSERT INTO announcement_reads (user_id, announcement_id, read_at)
            SELECT :user_id, a.id, NOW() FROM announcements a
            ON CONFLICT (user_id, announcement_id) DO NOTHING;
            """,
            {"user_id": user_id},
        )
        return True
