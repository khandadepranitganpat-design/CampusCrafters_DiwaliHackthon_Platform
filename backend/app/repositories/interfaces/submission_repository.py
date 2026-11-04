"""CampusCrafters Project Submission Repository Interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class ISubmissionRepository(ABC):
    """Abstract repository for Project Submissions and Draft Auto-Saves."""

    @abstractmethod
    def get_by_team_id(self, team_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve submission record for a team."""
        pass

    @abstractmethod
    def get_by_id(self, submission_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a submission record by its own identifier."""
        pass

    @abstractmethod
    def save_draft(self, team_id: str, draft_data: Dict[str, Any]) -> Dict[str, Any]:
        """Auto-save submission draft. Can accept problem_statement_id: null if unselected."""
        pass

    @abstractmethod
    def submit_project(self, team_id: str, submission_data: Dict[str, Any]) -> Dict[str, Any]:
        """Finalize and permanently lock project submission."""
        pass

    @abstractmethod
    def sync_problem_statement(self, team_id: str, problem_statement_id: Optional[str]) -> bool:
        """Propagate problem selection change to existing submission draft."""
        pass

