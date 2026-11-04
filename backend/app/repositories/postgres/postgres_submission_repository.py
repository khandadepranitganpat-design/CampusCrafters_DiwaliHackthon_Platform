"""CampusCrafters Concrete PostgreSQL Submission Repository."""

import json
from typing import Any, Dict, Optional

from app.repositories.interfaces.submission_repository import ISubmissionRepository
from app.repositories.postgres._common import load_json, normalize_timestamps
from app.repositories.postgres.db import PostgresDatabase
from app.utils.helpers import generate_id

_TEXT_FIELDS = (
    "project_title",
    "short_description",
    "detailed_description",
    "repository_url",
    "demo_url",
    "presentation_url",
)


class PostgresSubmissionRepository(ISubmissionRepository):
    """PostgreSQL adapter for the project_submissions table (one row per team)."""

    def __init__(self, db: PostgresDatabase):
        self.db = db

    @staticmethod
    def _normalize(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not row:
            return None
        out = normalize_timestamps(row, ("created_at", "updated_at", "submitted_at"))
        out["tech_stack"] = load_json(out.get("tech_stack"), [])
        out["is_locked"] = out.get("status") == "SUBMITTED"
        return out

    def get_by_team_id(self, team_id: str) -> Optional[Dict[str, Any]]:
        return self._normalize(
            self.db.fetch_one("SELECT * FROM project_submissions WHERE team_id = :team_id;", {"team_id": team_id})
        )

    def get_by_id(self, submission_id: str) -> Optional[Dict[str, Any]]:
        return self._normalize(
            self.db.fetch_one("SELECT * FROM project_submissions WHERE id = :id;", {"id": submission_id})
        )

    def save_draft(self, team_id: str, draft_data: Dict[str, Any]) -> Dict[str, Any]:
        """Upsert a draft. Only keys present in draft_data overwrite stored values (partial auto-save).

        A row that is already SUBMITTED is never modified here (defence in depth; the service
        also rejects it), enforced by the WHERE clause on the conflict branch.
        """
        params: Dict[str, Any] = {"id": generate_id("sub-"), "team_id": team_id}
        insert_cols = ["id", "team_id"]
        update_sets = []

        for field in _TEXT_FIELDS:
            if field in draft_data:
                params[field] = draft_data[field] or ""
                insert_cols.append(field)
                update_sets.append(f"{field} = EXCLUDED.{field}")
        if "tech_stack" in draft_data:
            params["tech_stack"] = json.dumps(list(draft_data["tech_stack"] or []))
            insert_cols.append("tech_stack")
            update_sets.append("tech_stack = EXCLUDED.tech_stack")
        if "problem_statement_id" in draft_data:
            params["problem_statement_id"] = draft_data["problem_statement_id"]
            insert_cols.append("problem_statement_id")
            update_sets.append("problem_statement_id = EXCLUDED.problem_statement_id")
        update_sets.append("updated_at = NOW()")

        cols_sql = ", ".join(insert_cols)
        vals_sql = ", ".join(f":{c}" for c in insert_cols)
        query = f"""
        INSERT INTO project_submissions ({cols_sql})
        VALUES ({vals_sql})
        ON CONFLICT (team_id) DO UPDATE SET {', '.join(update_sets)}
        WHERE project_submissions.status <> 'SUBMITTED'
        RETURNING *;
        """
        row = self.db.fetch_one(query, params)
        if row is None:  # conflict branch skipped because the row is locked
            row = self.db.fetch_one("SELECT * FROM project_submissions WHERE team_id = :team_id;", {"team_id": team_id})
        return self._normalize(row)

    def submit_project(self, team_id: str, submission_data: Dict[str, Any]) -> Dict[str, Any]:
        """Persist final field values and permanently lock the submission."""
        self.save_draft(team_id, submission_data)
        row = self.db.fetch_one(
            """
            UPDATE project_submissions
               SET status = 'SUBMITTED', submitted_at = NOW(), updated_at = NOW()
             WHERE team_id = :team_id AND status <> 'SUBMITTED'
            RETURNING *;
            """,
            {"team_id": team_id},
        )
        if row is None:  # already submitted: return the locked record unchanged
            row = self.db.fetch_one("SELECT * FROM project_submissions WHERE team_id = :team_id;", {"team_id": team_id})
        return self._normalize(row)

    def sync_problem_statement(self, team_id: str, problem_statement_id: Optional[str]) -> bool:
        res = self.db.execute(
            """
            UPDATE project_submissions
               SET problem_statement_id = :ps, updated_at = NOW()
             WHERE team_id = :team_id AND status <> 'SUBMITTED';
            """,
            {"ps": problem_statement_id, "team_id": team_id},
        )
        return res.rowcount > 0
