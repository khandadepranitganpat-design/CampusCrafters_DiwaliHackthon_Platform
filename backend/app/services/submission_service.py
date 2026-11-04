"""CampusCrafters Project Submission Service."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from flask import current_app

from app.errors.exceptions import (
    DeadlineExpiredError,
    MinTeamSizeNotMetError,
    NotFoundError,
    ProblemStatementRequiredError,
    SubmissionLockedError,
)
from app.repositories.interfaces.submission_repository import ISubmissionRepository
from app.repositories.interfaces.problem_repository import IProblemRepository
from app.repositories.interfaces.team_repository import ITeamRepository
from app.repositories.interfaces.event_config_repository import IEventConfigRepository
from app.utils.helpers import parse_utc_timestamp


class SubmissionService:
    """Encapsulates draft auto-saves, final submission locks, deadline enforcement, and completeness checks."""

    def __init__(
        self,
        submission_repo: ISubmissionRepository,
        problem_repo: IProblemRepository,
        team_repo: ITeamRepository,
        config_repo: IEventConfigRepository,
    ):
        self.submission_repo = submission_repo
        self.problem_repo = problem_repo
        self.team_repo = team_repo
        self.config_repo = config_repo

    def _check_deadline(self) -> None:
        """Ensure current time does not exceed configured submission deadline."""
        config = self.config_repo.get_config()
        deadline_str = config.get("submission_deadline_utc") or current_app.config.get("SUBMISSION_DEADLINE_UTC")
        if deadline_str:
            deadline = parse_utc_timestamp(deadline_str)
            if deadline and datetime.now(timezone.utc) > deadline:
                raise DeadlineExpiredError(
                    f"Submission window has closed. The deadline was {deadline_str}."
                )

    def get_team_submission(self, team_id: str) -> Dict[str, Any]:
        """Retrieve submission record for team."""
        sub = self.submission_repo.get_by_team_id(team_id)
        if not sub:
            raise NotFoundError("No submission or draft found for this team.")
        return sub

    def save_draft(self, team_id: str, draft_data: Dict[str, Any]) -> Dict[str, Any]:
        """Auto-save submission draft.
        
        Permits partial payloads and allows problem_statement_id: null if no problem is selected yet.
        """
        self._check_deadline()

        existing = self.submission_repo.get_by_team_id(team_id)
        if existing and existing.get("status") == "SUBMITTED":
            raise SubmissionLockedError("Cannot update draft. Project submission is already finalized and locked.")

        # If problem_statement_id is not provided in draft payload, sync from problem_selections if exists
        payload = dict(draft_data)
        if not payload.get("problem_statement_id"):
            selection = self.problem_repo.get_selection(team_id)
            if selection:
                payload["problem_statement_id"] = selection.get("problem_statement_id")

        saved = self.submission_repo.save_draft(team_id, payload)
        return {
            "id": saved["id"],
            "team_id": saved["team_id"],
            "status": saved["status"],
            "updated_at": saved["updated_at"],
        }

    def submit_final_project(self, team_id: str, submission_data: Dict[str, Any]) -> Dict[str, Any]:
        """Finalize and permanently lock project submission."""
        self._check_deadline()

        existing = self.submission_repo.get_by_team_id(team_id)
        if existing and existing.get("status") == "SUBMITTED":
            raise SubmissionLockedError("Project is already submitted and locked.")

        # Invariant 1: MIN_TEAM_SIZE check
        team = self.team_repo.get_by_id(team_id)
        if not team:
            raise NotFoundError("Team not found.")

        min_team_size = current_app.config.get("MIN_TEAM_SIZE", 2)
        members = team.get("member_ids", [])
        if len(members) < min_team_size:
            raise MinTeamSizeNotMetError(
                f"Your team has {len(members)} member(s). A minimum of {min_team_size} members is required for final submission."
            )

        # Invariant 2: Active Problem Statement check
        selection = self.problem_repo.get_selection(team_id)
        selected_ps_id = selection.get("problem_statement_id") if selection else None
        if not selected_ps_id:
            raise ProblemStatementRequiredError(
                "You must select an active problem statement before submitting your project."
            )

        # Sync problem statement ID to submission
        payload = dict(submission_data)
        payload["problem_statement_id"] = selected_ps_id

        submitted = self.submission_repo.submit_project(team_id, payload)
        return {
            "id": submitted["id"],
            "team_id": submitted["team_id"],
            "status": "SUBMITTED",
            "is_locked": True,
            "submitted_at": submitted["submitted_at"],
        }

