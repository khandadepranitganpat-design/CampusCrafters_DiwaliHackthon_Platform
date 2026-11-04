"""CampusCrafters Thread-safe In-Memory Token Revocation Repository."""

import threading
from datetime import datetime, timezone
from typing import Dict, Any
from app.repositories.interfaces.token_revocation_repository import ITokenRevocationRepository
from app.utils.helpers import utc_now


class MemoryTokenRevocationRepository(ITokenRevocationRepository):
    """Thread-safe in-memory adapter for revoked JWT denylist."""

    def __init__(self):
        self._lock = threading.RLock()
        self._revoked_tokens: Dict[str, Dict[str, Any]] = {}

    def revoke_token(self, jti: str, user_id: str, expires_at: datetime) -> bool:
        with self._lock:
            self._revoked_tokens[jti] = {
                "jti": jti,
                "user_id": user_id,
                "expires_at": expires_at,
                "revoked_at": utc_now(),
            }
            return True

    def is_token_revoked(self, jti: str) -> bool:
        with self._lock:
            return jti in self._revoked_tokens

    def purge_expired_tokens(self) -> int:
        with self._lock:
            now = datetime.now(timezone.utc)
            expired_jtis = [
                jti
                for jti, item in self._revoked_tokens.items()
                if item["expires_at"] < now
            ]
            for jti in expired_jtis:
                del self._revoked_tokens[jti]
            return len(expired_jtis)

