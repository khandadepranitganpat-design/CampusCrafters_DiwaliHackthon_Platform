"""CampusCrafters Track Repository Interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class ITrackRepository(ABC):
    """Abstract repository for Hackathon Tracks."""

    @abstractmethod
    def list_all(self) -> List[Dict[str, Any]]:
        """Retrieve all active hackathon tracks."""
        pass

    @abstractmethod
    def get_by_id(self, track_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a track by unique identifier."""
        pass

