"""CampusCrafters Team Repository Interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class ITeamRepository(ABC):
    """Abstract repository for Teams and Team Memberships."""

    @abstractmethod
    def list_all(self, track_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all teams, optionally filtered by track_id and status."""
        pass

    @abstractmethod
    def create_team(self, team_data: Dict[str, Any], creator_id: str) -> Dict[str, Any]:
        """Atomically create a team and add the creator as the first member."""
        pass

    @abstractmethod
    def get_by_id(self, team_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve team by ID, including its member list."""
        pass

    @abstractmethod
    def get_by_join_code(self, code: str) -> Optional[Dict[str, Any]]:
        """Retrieve team by uppercase join code."""
        pass

    @abstractmethod
    def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve the active team that user_id currently belongs to."""
        pass

    @abstractmethod
    def add_member(self, team_id: str, user_id: str, max_team_size: int = 5) -> bool:
        """Add user to team, enforcing max_team_size and 1-team-per-user."""
        pass

    @abstractmethod
    def remove_member(self, team_id: str, user_id: str) -> bool:
        """Remove user from team."""
        pass

    @abstractmethod
    def transfer_leadership(self, team_id: str, new_leader_id: str) -> bool:
        """Designate a new team leader from existing members."""
        pass

    @abstractmethod
    def update_name(self, team_id: str, new_name: str) -> bool:
        """Update team display name."""
        pass

    @abstractmethod
    def regenerate_join_code(self, team_id: str, new_code: str) -> bool:
        """Rotate team join code."""
        pass

    @abstractmethod
    def disband_team(self, team_id: str) -> bool:
        """Disband team and release all memberships."""
        pass

