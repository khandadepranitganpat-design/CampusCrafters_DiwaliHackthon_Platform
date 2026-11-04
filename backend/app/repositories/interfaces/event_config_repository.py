"""CampusCrafters Event Configuration Repository Interface."""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, Optional


class IEventConfigRepository(ABC):
    """Abstract repository for Global Hackathon Configuration and Lifecycle State."""

    @abstractmethod
    def get_config(self) -> Dict[str, Any]:
        """Retrieve global event configuration snapshot."""
        pass

    @abstractmethod
    def set_event_state(self, new_state: str, updated_by: Optional[str] = None) -> bool:
        """Update the global event state (e.g. reg_open, full, event_live, judging)."""
        pass

    @abstractmethod
    def set_submission_deadline(self, deadline_utc: Optional[datetime], updated_by: Optional[str] = None) -> bool:
        """Set or update the global project submission deadline."""
        pass

