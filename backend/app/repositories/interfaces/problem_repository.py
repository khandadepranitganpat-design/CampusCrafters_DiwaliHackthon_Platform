"""CampusCrafters Problem Statement Repository Interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class IProblemRepository(ABC):
    """Abstract repository for Problem Statements and Team Problem Selections."""

    @abstractmethod
    def list_all(self, track_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List active problem statements, optionally filtered by track_id."""
        pass

    @abstractmethod
    def get_by_id(self, problem_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve problem statement details by ID."""
        pass

    @abstractmethod
    def get_selection(self, team_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve problem selection record for a team."""
        pass

    @abstractmethod
    def save_selection(self, team_id: str, problem_id: str, selected_by: str) -> Dict[str, Any]:
        """Lock in or update a team's problem statement selection."""
        pass

    @abstractmethod
    def clear_selection(self, team_id: str) -> bool:
        """Clear problem selection for a team."""
        pass

    @abstractmethod
    def update_active_status(self, problem_id: str, is_active: bool) -> bool:
        """Toggle active/unlock status of a problem statement."""
        pass

