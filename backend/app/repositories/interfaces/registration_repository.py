"""CampusCrafters Registration Repository Interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class IRegistrationRepository(ABC):
    """Abstract repository for Participant Registrations and Waitlist."""

    @abstractmethod
    def create_registration(self, reg_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create and persist a confirmed registration with ticket pass."""
        pass

    @abstractmethod
    def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve registration record by user ID."""
        pass

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieve registration record by email address."""
        pass

    @abstractmethod
    def get_by_ticket_code(self, ticket_code: str) -> Optional[Dict[str, Any]]:
        """Retrieve registration record by ticket code."""
        pass

    @abstractmethod
    def create_waitlist_entry(self, waitlist_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create and persist a waitlist entry when the event is full."""
        pass

