"""CampusCrafters Thread-safe In-Memory Submission Repository."""

import threading
from typing import Any, Dict, Optional
from app.repositories.interfaces.submission_repository import ISubmissionRepository
from app.repositories.memory.seed_data import DEV_SUBMISSIONS
from app.utils.helpers import utc_now, generate_id


class MemorySubmissionRepository(ISubmissionRepository):
    """Thread-safe in-memory adapter for project submissions and drafts."""

    def __init__(self, seed: bool = True):
        self._lock = threading.RLock()
        self._submissions_by_team: Dict[str, Dict[str, Any]] = {}

        if seed:
            for s in DEV_SUBMISSIONS:
                record = dict(s)
                self._submissions_by_team[record["team_id"]] = record

    def get_by_team_id(self, team_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            sub = self._submissions_by_team.get(team_id)
            return dict(sub) if sub else None

    def get_by_id(self, submission_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            for sub in self._submissions_by_team.values():
                if sub.get("id") == submission_id:
                    return dict(sub)
            return None

    def save_draft(self, team_id: str, draft_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            sub = self._submissions_by_team.get(team_id)
            now = utc_now()
            if not sub:
                sub = {
                    "id": draft_data.get("id") or generate_id("sub-"),
                    "team_id": team_id,
                    "problem_statement_id": draft_data.get("problem_statement_id"),
                    "project_title": draft_data.get("project_title", ""),
                    "short_description": draft_data.get("short_description", ""),
                    "detailed_description": draft_data.get("detailed_description", ""),
                    "repository_url": draft_data.get("repository_url", ""),
                    "demo_url": draft_data.get("demo_url", ""),
                    "presentation_url": draft_data.get("presentation_url", ""),
                    "tech_stack": list(draft_data.get("tech_stack", [])),
                    "status": "DRAFT",
                    "is_locked": False,
                    "created_at": now,
                    "updated_at": now,
                    "submitted_at": None,
                }
                self._submissions_by_team[team_id] = sub
            else:
                for key in (
                    "project_title",
                    "short_description",
                    "detailed_description",
                    "repository_url",
                    "demo_url",
                    "presentation_url",
                ):
                    if key in draft_data:
                        sub[key] = draft_data[key]
                if "tech_stack" in draft_data:
                    sub["tech_stack"] = list(draft_data["tech_stack"])
                if "problem_statement_id" in draft_data:
                    sub["problem_statement_id"] = draft_data["problem_statement_id"]
                sub["updated_at"] = now

            return dict(sub)

    def submit_project(self, team_id: str, submission_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            sub = self._submissions_by_team.get(team_id)
            now = utc_now()
            if not sub:
                sub = {
                    "id": submission_data.get("id") or generate_id("sub-"),
                    "team_id": team_id,
                    "created_at": now,
                }
                self._submissions_by_team[team_id] = sub

            for key in (
                "project_title",
                "short_description",
                "detailed_description",
                "repository_url",
                "demo_url",
                "presentation_url",
                "problem_statement_id",
            ):
                if key in submission_data:
                    sub[key] = submission_data[key]
            if "tech_stack" in submission_data:
                sub["tech_stack"] = list(submission_data["tech_stack"])

            sub["status"] = "SUBMITTED"
            sub["is_locked"] = True
            sub["submitted_at"] = now
            sub["updated_at"] = now
            return dict(sub)

    def sync_problem_statement(self, team_id: str, problem_statement_id: Optional[str]) -> bool:
        with self._lock:
            sub = self._submissions_by_team.get(team_id)
            if not sub:
                return False
            sub["problem_statement_id"] = problem_statement_id
            sub["updated_at"] = utc_now()
            return True

