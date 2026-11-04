"""CampusCrafters Problem Statement & Selection Service."""

from typing import Any, Dict, List, Optional
from app.errors.exceptions import (
    NotFoundError,
    SubmissionLockedError,
    ValidationError,
)
from app.repositories.interfaces.problem_repository import IProblemRepository
from app.repositories.interfaces.submission_repository import ISubmissionRepository
from app.repositories.interfaces.track_repository import ITrackRepository


class ProblemService:
    """Encapsulates problem statements and team selection synchronization."""

    def __init__(
        self,
        problem_repo: IProblemRepository,
        submission_repo: ISubmissionRepository,
        track_repo: ITrackRepository,
    ):
        self.problem_repo = problem_repo
        self.submission_repo = submission_repo
        self.track_repo = track_repo

    def list_tracks(self) -> List[Dict[str, Any]]:
        """List all tracks."""
        return self.track_repo.list_all()

    def list_problem_statements(
        self, track_id: Optional[str] = None, difficulty: Optional[str] = None, search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """List problems with optional filtering."""
        problems = self.problem_repo.list_all(track_id=track_id)
        result = []
        for p in problems:
            if difficulty and p.get("difficulty", "").lower() != difficulty.lower():
                continue
            if search:
                term = search.lower()
                title_match = term in p.get("title", "").lower()
                desc_match = term in p.get("description", "").lower()
                tag_match = any(term in str(t).lower() for t in p.get("tags", []))
                if not (title_match or desc_match or tag_match):
                    continue
            result.append({
                "id": p["id"],
                "track_id": p["track_id"],
                "title": p["title"],
                "difficulty": p.get("difficulty"),
                "domain": p.get("domain"),
                "tags": p.get("tags", []),
            })
        return result

    def get_problem_statement(self, problem_id: str) -> Dict[str, Any]:
        """Get complete problem details."""
        p = self.problem_repo.get_by_id(problem_id)
        if not p:
            raise NotFoundError(f"Problem statement '{problem_id}' not found.")
        return p

    def get_team_selection(self, team_id: str) -> Optional[Dict[str, Any]]:
        """Get the problem statement currently locked in by a team."""
        sel = self.problem_repo.get_selection(team_id)
        if not sel:
            return None

        # Check if submission is locked
        sub = self.submission_repo.get_by_team_id(team_id)
        is_locked = sub is not None and sub.get("status") == "SUBMITTED"

        out = dict(sel)
        out["is_locked"] = is_locked
        return out

    def select_problem(self, team_id: str, leader_id: str, problem_id: str) -> Dict[str, Any]:
        """Select problem statement for team and propagate to draft."""
        # Check submission lock
        sub = self.submission_repo.get_by_team_id(team_id)
        if sub and sub.get("status") == "SUBMITTED":
            raise SubmissionLockedError(
                "Cannot change problem statement. Project submission is already finalized and locked."
            )

        problem = self.problem_repo.get_by_id(problem_id)
        if not problem or not problem.get("is_active", True):
            raise NotFoundError(f"Problem statement '{problem_id}' not found or inactive.")

        saved = self.problem_repo.save_selection(team_id, problem_id, leader_id)

        # Propagate selection change to existing draft
        if sub:
            self.submission_repo.sync_problem_statement(team_id, problem_id)

        return saved

    def clear_problem_selection(self, team_id: str) -> bool:
        """Clear problem selection and decouple from draft."""
        sub = self.submission_repo.get_by_team_id(team_id)
        if sub and sub.get("status") == "SUBMITTED":
            raise SubmissionLockedError(
                "Cannot clear problem statement. Project submission is already finalized and locked."
            )

        success = self.problem_repo.clear_selection(team_id)
        if sub:
            self.submission_repo.sync_problem_statement(team_id, None)
        return success

