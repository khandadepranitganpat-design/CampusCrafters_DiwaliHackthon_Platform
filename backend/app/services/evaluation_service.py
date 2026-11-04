"""CampusCrafters Evaluation & Scoring Service."""

from typing import Any, Dict, List, Optional
from app.errors.exceptions import EvaluationLockedError, NotFoundError
from app.repositories.interfaces.evaluation_repository import IEvaluationRepository
from app.repositories.interfaces.submission_repository import ISubmissionRepository
from app.repositories.interfaces.team_repository import ITeamRepository
from app.repositories.interfaces.event_config_repository import IEventConfigRepository


class EvaluationService:
    """Encapsulates judge evaluations, rubric score calculations, and event state locks."""

    def __init__(
        self,
        evaluation_repo: IEvaluationRepository,
        submission_repo: ISubmissionRepository,
        team_repo: ITeamRepository,
        config_repo: IEventConfigRepository,
    ):
        self.evaluation_repo = evaluation_repo
        self.submission_repo = submission_repo
        self.team_repo = team_repo
        self.config_repo = config_repo

    def _check_judging_active(self) -> None:
        """Ensure scores can only be recorded during 'judging' event state."""
        config = self.config_repo.get_config()
        current_state = config.get("event_state")
        if current_state != "judging":
            raise EvaluationLockedError(
                f"Evaluation scores can only be submitted or modified while event state is 'judging'. Current state: '{current_state}'."
            )

    def list_submissions_for_judge(self, judge_id: str, track_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List submitted projects ready for evaluation."""
        teams = self.team_repo.list_all(track_id=track_id)
        result = []
        for t in teams:
            sub = self.submission_repo.get_by_team_id(t["id"])
            if sub and sub.get("status") == "SUBMITTED":
                judge_score = self.evaluation_repo.get_score_by_judge(sub["id"], judge_id)
                result.append({
                    "id": sub["id"],
                    "team_id": t["id"],
                    "team_name": t["name"],
                    "track_id": t["track_id"],
                    "project_title": sub.get("project_title", ""),
                    "repository_url": sub.get("repository_url", ""),
                    "demo_url": sub.get("demo_url", ""),
                    "has_evaluated": judge_score is not None,
                })
        return result

    def get_submission_detail_for_judge(self, submission_id: str, judge_id: str) -> Dict[str, Any]:
        """Get project details and current judge's evaluation."""
        found_sub = self.submission_repo.get_by_id(submission_id)
        if not found_sub or found_sub.get("status") != "SUBMITTED":
            raise NotFoundError(f"Submission '{submission_id}' not found.")

        judge_score = self.evaluation_repo.get_score_by_judge(submission_id, judge_id)

        return {
            "submission": {
                "id": found_sub["id"],
                "team_id": found_sub["team_id"],
                "project_title": found_sub.get("project_title", ""),
                "detailed_description": found_sub.get("detailed_description", ""),
                "repository_url": found_sub.get("repository_url", ""),
                "demo_url": found_sub.get("demo_url", ""),
                "tech_stack": found_sub.get("tech_stack", []),
            },
            "my_score": judge_score,
        }

    def submit_score(self, submission_id: str, judge_id: str, score_data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit or update evaluation score (upsert) with server-computed total_score."""
        self._check_judging_active()

        found_sub = self.submission_repo.get_by_id(submission_id)
        if not found_sub or found_sub.get("status") != "SUBMITTED":
            raise NotFoundError(f"Submission '{submission_id}' not found.")

        saved = self.evaluation_repo.submit_score(submission_id, judge_id, score_data)
        return saved

