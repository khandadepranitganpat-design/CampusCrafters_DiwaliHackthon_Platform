"""CampusCrafters Thread-safe In-Memory Problem Repository."""

import threading
from typing import Any, Dict, List, Optional
from app.repositories.interfaces.problem_repository import IProblemRepository
from app.repositories.memory.seed_data import PRODUCTION_PROBLEM_STATEMENTS, DEV_PROBLEM_SELECTIONS
from app.utils.helpers import utc_now


class MemoryProblemRepository(IProblemRepository):
    """Thread-safe in-memory adapter for problem statements and team selections."""

    def __init__(self, seed_selections: bool = True):
        self._lock = threading.RLock()
        self._problems: Dict[str, Dict[str, Any]] = {}
        self._selections: Dict[str, Dict[str, Any]] = {}

        for p in PRODUCTION_PROBLEM_STATEMENTS:
            self._problems[p["id"]] = dict(p)

        if seed_selections:
            for s in DEV_PROBLEM_SELECTIONS:
                self._selections[s["team_id"]] = dict(s)

    def list_all(self, track_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            result = []
            for p in self._problems.values():
                if not p.get("is_active", True):
                    continue
                if track_id and p.get("track_id") != track_id:
                    continue
                result.append(dict(p))
            return result

    def get_by_id(self, problem_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            p = self._problems.get(problem_id)
            return dict(p) if p else None

    def get_selection(self, team_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            sel = self._selections.get(team_id)
            if not sel:
                return None
            out = dict(sel)
            # Attach problem statement details
            ps = self._problems.get(sel["problem_statement_id"])
            if ps:
                out["problem_statement"] = dict(ps)
            return out

    def save_selection(self, team_id: str, problem_id: str, selected_by: str) -> Dict[str, Any]:
        with self._lock:
            record = {
                "team_id": team_id,
                "problem_statement_id": problem_id,
                "selected_by": selected_by,
                "selected_at": utc_now(),
            }
            self._selections[team_id] = record
            return dict(record)

    def clear_selection(self, team_id: str) -> bool:
        with self._lock:
            if team_id in self._selections:
                del self._selections[team_id]
                return True
            return False

    def update_active_status(self, problem_id: str, is_active: bool) -> bool:
        with self._lock:
            if problem_id not in self._problems:
                return False
            self._problems[problem_id]["is_active"] = is_active
            return True

