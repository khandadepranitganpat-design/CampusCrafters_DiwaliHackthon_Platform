"""CampusCrafters Concrete PostgreSQL Token Revocation Repository."""

from datetime import datetime

from app.repositories.interfaces.token_revocation_repository import ITokenRevocationRepository
from app.repositories.postgres.db import PostgresDatabase


class PostgresTokenRevocationRepository(ITokenRevocationRepository):
    """PostgreSQL adapter for the revoked_tokens denylist (shared by all gunicorn workers)."""

    def __init__(self, db: PostgresDatabase):
        self.db = db

    def revoke_token(self, jti: str, user_id: str, expires_at: datetime) -> bool:
        # Opportunistic garbage collection keeps the table small without a scheduler.
        self.purge_expired_tokens()
        self.db.execute(
            """
            INSERT INTO revoked_tokens (jti, user_id, expires_at, revoked_at)
            VALUES (:jti, :user_id, :expires_at, NOW())
            ON CONFLICT (jti) DO NOTHING;
            """,
            {"jti": jti, "user_id": user_id, "expires_at": expires_at},
        )
        return True

    def is_token_revoked(self, jti: str) -> bool:
        row = self.db.fetch_one("SELECT 1 AS hit FROM revoked_tokens WHERE jti = :jti;", {"jti": jti})
        return row is not None

    def purge_expired_tokens(self) -> int:
        res = self.db.execute("DELETE FROM revoked_tokens WHERE expires_at < NOW();")
        return res.rowcount
