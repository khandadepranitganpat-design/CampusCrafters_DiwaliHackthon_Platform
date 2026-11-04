"""CampusCrafters Token Revocation Repository Interface."""

from abc import ABC, abstractmethod
from datetime import datetime


class ITokenRevocationRepository(ABC):
    """Abstract repository for Server-side Token Denylist."""

    @abstractmethod
    def revoke_token(self, jti: str, user_id: str, expires_at: datetime) -> bool:
        """Revoke a token identifier upon user logout."""
        pass

    @abstractmethod
    def is_token_revoked(self, jti: str) -> bool:
        """Check whether a token identifier is currently revoked."""
        pass

    @abstractmethod
    def purge_expired_tokens(self) -> int:
        """Clean up expired tokens from revocation denylist."""
        pass

