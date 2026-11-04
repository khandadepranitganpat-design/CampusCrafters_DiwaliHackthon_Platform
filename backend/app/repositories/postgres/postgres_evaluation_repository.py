"""CampusCrafters Concrete PostgreSQL Evaluation Repository."""

from typing import Any, Dict, List, Optional

from app.repositories.interfaces.evaluation_repository import IEvaluationRepository
from app.repositories.postgres._common import normalize_timestamps
from app.repositories.postgres.db import PostgresDatabase


class PostgresEvaluationRepository(IEvaluationRepository):
    """PostgreSQL adapter for evaluation_scores."""

    def __init__(self, db: PostgresDatabase):
        self.db = db

    @staticmethod
    def _normalize(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        out = normalize_timestamps(row, ("submitted_at", "updated_at"))
        if out is not None:
            out.pop("id", None)
        return out

    def list_submissions_for_evaluation(self, track_id: Optional[str] = None) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {}
        track_sql = ""
        if track_id:
            track_sql = "AND t.track_id = :track_id"
            params["track_id"] = track_id
        rows = self.db.fetch_all(
            f"""
            SELECT s.id, s.team_id, t.name AS team_name, t.track_id,
                   s.project_title, s.repository_url, s.demo_url
              FROM project_submissions s
              JOIN teams t ON t.id = s.team_id
             WHERE s.status = 'SUBMITTED' {track_sql}
             ORDER BY s.submitted_at ASC;
            """,
            params,
        )
        return rows

    def get_submission_scores(self, submission_id: str) -> List[Dict[str, Any]]:
        rows = self.db.fetch_all(
            "SELECT * FROM evaluation_scores WHERE submission_id = :sid ORDER BY submitted_at ASC;",
            {"sid": submission_id},
        )
        return [self._normalize(r) for r in rows]

    def get_score_by_judge(self, submission_id: str, judge_id: str) -> Optional[Dict[str, Any]]:
        return self._normalize(
            self.db.fetch_one(
                "SELECT * FROM evaluation_scores WHERE submission_id = :sid AND judge_id = :jid;",
                {"sid": submission_id, "jid": judge_id},
            )
        )

    def submit_score(self, submission_id: str, judge_id: str, score_data: Dict[str, Any]) -> Dict[str, Any]:
        """Upsert a judge's rubric. total_score is always computed here, never trusted from input."""
        innovation = int(score_data.get("innovation_score", 0))
        technical = int(score_data.get("technical_score", 0))
        uiux = int(score_data.get("uiux_score", 0))
        impact = int(score_data.get("impact_score", 0))
        row = self.db.fetch_one(
            """
            INSERT INTO evaluation_scores
                (submission_id, judge_id, innovation_score, technical_score, uiux_score,
                 impact_score, total_score, feedback, submitted_at, updated_at)
            VALUES (:sid, :jid, :innovation, :technical, :uiux, :impact, :total, :feedback, NOW(), NOW())
            ON CONFLICT (submission_id, judge_id) DO UPDATE SET
                innovation_score = EXCLUDED.innovation_score,
                technical_score  = EXCLUDED.technical_score,
                uiux_score       = EXCLUDED.uiux_score,
                impact_score     = EXCLUDED.impact_score,
                total_score      = EXCLUDED.total_score,
                feedback         = EXCLUDED.feedback,
                updated_at       = NOW()
            RETURNING *;
            """,
            {
                "sid": submission_id,
                "jid": judge_id,
                "innovation": innovation,
                "technical": technical,
                "uiux": uiux,
                "impact": impact,
                "total": innovation + technical + uiux + impact,
                "feedback": score_data.get("feedback", ""),
            },
        )
        return self._normalize(row)
