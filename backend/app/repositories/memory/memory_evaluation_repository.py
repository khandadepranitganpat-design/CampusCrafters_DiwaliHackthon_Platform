"""CampusCrafters Thread-safe In-Memory Evaluation Repository."""

import threading
from typing import Any, Dict, List, Optional
from app.repositories.interfaces.evaluation_repository import IEvaluationRepository
from app.utils.helpers import utc_now


class MemoryEvaluationRepository(IEvaluationRepository):
    """Thread-safe in-memory adapter for evaluations and scoring."""

    def __init__(self):
        self._lock = threading.RLock()
        # Key: (submission_id, judge_id) -> score record
        self._scores: Dict[tuple, Dict[str, Any]] = {}

    def list_submissions_for_evaluation(self, track_id: Optional[str] = None) -> List[Dict[str, Any]]:
        # In memory, we'll coordinate this through the evaluation service with submission repo
        return []

    def get_submission_scores(self, submission_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            return [
                dict(rec)
                for key, rec in self._scores.items()
                if key[0] == submission_id
            ]

    def get_score_by_judge(self, submission_id: str, judge_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            rec = self._scores.get((submission_id, judge_id))
            return dict(rec) if rec else None

    def submit_score(self, submission_id: str, judge_id: str, score_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            key = (submission_id, judge_id)
            existing = self._scores.get(key)
            now = utc_now()

            # Server-enforced invariant: total_score = sum of rubrics
            innov = score_data.get("innovation_score", 0)
            tech = score_data.get("technical_score", 0)
            uiux = score_data.get("uiux_score", 0)
            impact = score_data.get("impact_score", 0)
            total = innov + tech + uiux + impact

            record = {
                "submission_id": submission_id,
                "judge_id": judge_id,
                "innovation_score": innov,
                "technical_score": tech,
                "uiux_score": uiux,
                "impact_score": impact,
                "total_score": total,
                "feedback": score_data.get("feedback", ""),
                "submitted_at": existing.get("submitted_at", now) if existing else now,
                "updated_at": now,
            }
            self._scores[key] = record
            return dict(record)

