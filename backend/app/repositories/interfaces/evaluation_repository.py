"""CampusCrafters Evaluation Repository Interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class IEvaluationRepository(ABC):
    """Abstract repository for Project Evaluations and Scoring."""

    @abstractmethod
    def list_submissions_for_evaluation(self, track_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List final submitted projects available for judging."""
        pass

    @abstractmethod
    def get_submission_scores(self, submission_id: str) -> List[Dict[str, Any]]:
        """Retrieve all judge scores recorded for a submission."""
        pass

    @abstractmethod
    def get_score_by_judge(self, submission_id: str, judge_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve evaluation score given by a specific judge."""
        pass

    @abstractmethod
    def submit_score(self, submission_id: str, judge_id: str, score_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert or update (upsert) an evaluation score."""
        pass

