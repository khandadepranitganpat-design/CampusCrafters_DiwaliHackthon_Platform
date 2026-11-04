"""CampusCrafters Concrete PostgreSQL Problem Repository."""

import json
from typing import Any, Dict, List, Optional
from app.repositories.interfaces.problem_repository import IProblemRepository
from app.repositories.postgres.db import PostgresDatabase


class PostgresProblemRepository(IProblemRepository):
    """PostgreSQL adapter for problem_statements and problem_selections tables."""

    def __init__(self, db: PostgresDatabase):
        self.db = db

    def _normalize_problem(self, row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not row:
            return None
        out = dict(row)
        for k in ("tags", "evaluation_criteria", "expected_deliverables"):
            if isinstance(out.get(k), str):
                out[k] = json.loads(out[k])
        return out

    def list_all(self, track_id: Optional[str] = None) -> List[Dict[str, Any]]:
        where_clause = "WHERE is_active = TRUE"
        params = {}
        if track_id:
            where_clause += " AND track_id = :track_id"
            params["track_id"] = track_id

        query = f"SELECT * FROM problem_statements {where_clause} ORDER BY id ASC;"
        rows = self.db.fetch_all(query, params)
        return [self._normalize_problem(r) for r in rows]

    def get_by_id(self, problem_id: str) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM problem_statements WHERE id = :id;"
        return self._normalize_problem(self.db.fetch_one(query, {"id": problem_id}))

    def get_selection(self, team_id: str) -> Optional[Dict[str, Any]]:
        query = """
        SELECT ps.*, p.title, p.track_id, p.difficulty
        FROM problem_selections ps
        JOIN problem_statements p ON ps.problem_statement_id = p.id
        WHERE ps.team_id = :team_id;
        """
        row = self.db.fetch_one(query, {"team_id": team_id})
        if not row:
            return None
        out = {
            "team_id": row["team_id"],
            "problem_statement_id": row["problem_statement_id"],
            "selected_by": row["selected_by"],
            "selected_at": row["selected_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(row["selected_at"], "strftime") else str(row["selected_at"]),
            "problem_statement": {
                "id": row["problem_statement_id"],
                "title": row["title"],
                "track_id": row["track_id"],
                "difficulty": row["difficulty"],
            },
        }
        return out

    def save_selection(self, team_id: str, problem_id: str, selected_by: str) -> Dict[str, Any]:
        query = """
        INSERT INTO problem_selections (team_id, problem_statement_id, selected_by, selected_at)
        VALUES (:team_id, :problem_id, :selected_by, NOW())
        ON CONFLICT (team_id) DO UPDATE SET
            problem_statement_id = EXCLUDED.problem_statement_id,
            selected_by = EXCLUDED.selected_by,
            selected_at = NOW()
        RETURNING *;
        """
        row = self.db.fetch_one(query, {
            "team_id": team_id,
            "problem_id": problem_id,
            "selected_by": selected_by,
        })
        return {
            "team_id": row["team_id"],
            "problem_statement_id": row["problem_statement_id"],
            "selected_by": row["selected_by"],
            "selected_at": row["selected_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(row["selected_at"], "strftime") else str(row["selected_at"]),
        }

    def clear_selection(self, team_id: str) -> bool:
        query = "DELETE FROM problem_selections WHERE team_id = :team_id;"
        res = self.db.execute(query, {"team_id": team_id})
        return res.rowcount > 0

    def update_active_status(self, problem_id: str, is_active: bool) -> bool:
        query = "UPDATE problem_statements SET is_active = :is_active WHERE id = :id;"
        res = self.db.execute(query, {"is_active": is_active, "id": problem_id})
        return res.rowcount > 0

