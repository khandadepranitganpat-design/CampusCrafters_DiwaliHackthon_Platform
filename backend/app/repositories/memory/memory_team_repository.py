"""CampusCrafters Thread-safe In-Memory Team Repository."""

import threading
from typing import Any, Dict, List, Optional
from app.repositories.interfaces.team_repository import ITeamRepository
from app.repositories.memory.seed_data import DEV_TEAMS
from app.utils.helpers import utc_now, generate_id, generate_join_code


class MemoryTeamRepository(ITeamRepository):
    """Thread-safe in-memory adapter for teams and team memberships."""

    def __init__(self, seed: bool = True):
        self._lock = threading.RLock()
        self._teams: Dict[str, Dict[str, Any]] = {}
        self._user_to_team: Dict[str, str] = {}
        self._join_code_to_team: Dict[str, str] = {}

        if seed:
            for t in DEV_TEAMS:
                team_copy = dict(t)
                team_id = team_copy["id"]
                team_copy["member_ids"] = list(t.get("member_ids", []))
                self._teams[team_id] = team_copy
                code_key = team_copy["join_code"].strip().upper()
                self._join_code_to_team[code_key] = team_id
                for member_id in team_copy["member_ids"]:
                    self._user_to_team[member_id] = team_id

    def list_all(self, track_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            result = []
            for t in self._teams.values():
                if status and t.get("status") != status:
                    continue
                if track_id and t.get("track_id") != track_id:
                    continue
                team_dict = dict(t)
                team_dict["member_ids"] = list(t.get("member_ids", []))
                team_dict["member_count"] = len(team_dict["member_ids"])
                result.append(team_dict)
            return result

    def create_team(self, team_data: Dict[str, Any], creator_id: str) -> Dict[str, Any]:
        with self._lock:
            team_id = team_data.get("id") or generate_id("team-")
            join_code = team_data.get("join_code") or generate_join_code()
            code_key = join_code.strip().upper()

            team_record = {
                "id": team_id,
                "name": team_data["name"],
                "join_code": join_code,
                "track_id": team_data["track_id"],
                "leader_id": creator_id,
                "member_ids": [creator_id],
                "status": "active",
                "created_at": utc_now(),
            }

            self._teams[team_id] = team_record
            self._join_code_to_team[code_key] = team_id
            self._user_to_team[creator_id] = team_id

            out = dict(team_record)
            out["member_ids"] = list(team_record["member_ids"])
            return out

    def get_by_id(self, team_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            t = self._teams.get(team_id)
            if not t:
                return None
            out = dict(t)
            out["member_ids"] = list(t.get("member_ids", []))
            return out

    def get_by_join_code(self, code: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            code_key = code.strip().upper()
            team_id = self._join_code_to_team.get(code_key)
            if not team_id or team_id not in self._teams:
                return None
            t = self._teams[team_id]
            out = dict(t)
            out["member_ids"] = list(t.get("member_ids", []))
            return out

    def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            team_id = self._user_to_team.get(user_id)
            if not team_id or team_id not in self._teams:
                return None
            t = self._teams[team_id]
            if t.get("status") != "active":
                return None
            out = dict(t)
            out["member_ids"] = list(t.get("member_ids", []))
            return out

    def add_member(self, team_id: str, user_id: str, max_team_size: int = 5) -> bool:
        with self._lock:
            team = self._teams.get(team_id)
            if not team or team.get("status") != "active":
                return False
            members = team.setdefault("member_ids", [])
            if len(members) >= max_team_size:
                return False
            if user_id in members:
                return True
            members.append(user_id)
            self._user_to_team[user_id] = team_id
            return True

    def remove_member(self, team_id: str, user_id: str) -> bool:
        with self._lock:
            team = self._teams.get(team_id)
            if not team:
                return False
            members = team.get("member_ids", [])
            if user_id in members:
                members.remove(user_id)
                self._user_to_team.pop(user_id, None)
                return True
            return False

    def transfer_leadership(self, team_id: str, new_leader_id: str) -> bool:
        with self._lock:
            team = self._teams.get(team_id)
            if not team:
                return False
            if new_leader_id not in team.get("member_ids", []):
                return False
            team["leader_id"] = new_leader_id
            return True

    def update_name(self, team_id: str, new_name: str) -> bool:
        with self._lock:
            team = self._teams.get(team_id)
            if not team:
                return False
            team["name"] = new_name
            return True

    def regenerate_join_code(self, team_id: str, new_code: str) -> bool:
        with self._lock:
            team = self._teams.get(team_id)
            if not team:
                return False
            old_code = team.get("join_code", "").strip().upper()
            self._join_code_to_team.pop(old_code, None)

            team["join_code"] = new_code
            self._join_code_to_team[new_code.strip().upper()] = team_id
            return True

    def disband_team(self, team_id: str) -> bool:
        with self._lock:
            team = self._teams.get(team_id)
            if not team:
                return False
            team["status"] = "disbanded"
            for member_id in team.get("member_ids", []):
                self._user_to_team.pop(member_id, None)
            code_key = team.get("join_code", "").strip().upper()
            self._join_code_to_team.pop(code_key, None)
            return True

