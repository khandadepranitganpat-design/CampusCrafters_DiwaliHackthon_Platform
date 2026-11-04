"""CampusCrafters Thread-safe In-Memory User Repository."""

import threading
from typing import Any, Dict, List, Optional
from app.repositories.interfaces.user_repository import IUserRepository
from app.repositories.memory.seed_data import DEV_USERS
from app.utils.helpers import utc_now


class MemoryUserRepository(IUserRepository):
    """Thread-safe in-memory adapter for users."""

    def __init__(self, seed: bool = True):
        self._lock = threading.RLock()
        self._users: Dict[str, Dict[str, Any]] = {}
        if seed:
            for u in DEV_USERS:
                user_copy = dict(u)
                self._users[user_copy["id"]] = user_copy

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            u = self._users.get(user_id)
            return dict(u) if u else None

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            target = email.strip().lower()
            for u in self._users.values():
                if u.get("email", "").strip().lower() == target:
                    return dict(u)
            return None

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            user_record = dict(user_data)
            now = utc_now()
            user_record.setdefault("created_at", now)
            user_record.setdefault("updated_at", now)
            user_record.setdefault("roles", ["participant"])
            user_record.setdefault("skills", [])
            self._users[user_record["id"]] = user_record
            return dict(user_record)

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._lock:
            if user_id not in self._users:
                return None
            user = self._users[user_id]
            for k, v in updates.items():
                if k not in ("id", "created_at"):
                    user[k] = v
            user["updated_at"] = utc_now()
            return dict(user)

