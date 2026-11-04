"""CampusCrafters User Repository Interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class IUserRepository(ABC):
    """Abstract repository for User accounts."""

    @abstractmethod
    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a user by unique identifier."""
        pass

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieve a user by case-insensitive email address."""
        pass

    @abstractmethod
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create and persist a new user record."""
        pass

    @abstractmethod
    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update fields on an existing user record."""
        pass

