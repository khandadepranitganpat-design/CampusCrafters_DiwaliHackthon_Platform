"""CampusCrafters Concrete PostgreSQL Team Repository."""

from typing import Any, Dict, List, Optional
from sqlalchemy import text
from app.repositories.interfaces.team_repository import ITeamRepository
from app.repositories.postgres.db import PostgresDatabase
from app.utils.helpers import generate_id, generate_join_code


class PostgresTeamRepository(ITeamRepository):
    """PostgreSQL adapter for teams and team_memberships tables."""

    def __init__(self, db: PostgresDatabase):
        self.db = db

    def _normalize_team(self, team_row: Optional[Dict[str, Any]], member_ids: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
        if not team_row:
            return None
        out = dict(team_row)
        out["member_ids"] = member_ids or []
        out["member_count"] = len(out["member_ids"])
        if out.get("created_at") and hasattr(out["created_at"], "strftime"):
            out["created_at"] = out["created_at"].strftime("%Y-%m-%dT%H:%M:%SZ")
        return out

    def list_all(self, track_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        where_clauses = []
        params: Dict[str, Any] = {}
        if track_id:
            where_clauses.append("t.track_id = :track_id")
            params["track_id"] = track_id
        if status:
            where_clauses.append("t.status = :status")
            params["status"] = status

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        query = f"""
        SELECT t.*, array_agg(tm.user_id) FILTER (WHERE tm.user_id IS NOT NULL) AS members
        FROM teams t
        LEFT JOIN team_memberships tm ON t.id = tm.team_id
        {where_sql}
        GROUP BY t.id
        ORDER BY t.created_at DESC;
        """
        rows = self.db.fetch_all(query, params)
        result = []
        for r in rows:
            m_list = r.pop("members", []) or []
            result.append(self._normalize_team(r, m_list))
        return result

    def create_team(self, team_data: Dict[str, Any], creator_id: str) -> Dict[str, Any]:
        """Atomically insert team and creator membership inside a single transaction."""
        team_id = team_data.get("id") or generate_id("team-")
        join_code = team_data.get("join_code") or generate_join_code()

        with self.db.connect() as conn:
            # Insert team
            insert_team_sql = text("""
            INSERT INTO teams (id, name, join_code, track_id, leader_id, status, created_at)
            VALUES (:id, :name, :join_code, :track_id, :leader_id, 'active', NOW())
            RETURNING *;
            """)
            team_res = conn.execute(insert_team_sql, {
                "id": team_id,
                "name": team_data["name"],
                "join_code": join_code,
                "track_id": team_data["track_id"],
                "leader_id": creator_id,
            })
            team_row = dict(team_res.mappings().first())

            # Insert membership
            insert_mem_sql = text("""
            INSERT INTO team_memberships (team_id, user_id, joined_at)
            VALUES (:team_id, :user_id, NOW());
            """)
            conn.execute(insert_mem_sql, {"team_id": team_id, "user_id": creator_id})

        return self._normalize_team(team_row, [creator_id])

    def get_by_id(self, team_id: str) -> Optional[Dict[str, Any]]:
        query = """
        SELECT t.*, array_agg(tm.user_id) FILTER (WHERE tm.user_id IS NOT NULL) AS members
        FROM teams t
        LEFT JOIN team_memberships tm ON t.id = tm.team_id
        WHERE t.id = :id
        GROUP BY t.id;
        """
        r = self.db.fetch_one(query, {"id": team_id})
        if not r:
            return None
        m_list = r.pop("members", []) or []
        return self._normalize_team(r, m_list)

    def get_by_join_code(self, code: str) -> Optional[Dict[str, Any]]:
        query = """
        SELECT t.*, array_agg(tm.user_id) FILTER (WHERE tm.user_id IS NOT NULL) AS members
        FROM teams t
        LEFT JOIN team_memberships tm ON t.id = tm.team_id
        WHERE UPPER(t.join_code) = UPPER(:code)
        GROUP BY t.id;
        """
        r = self.db.fetch_one(query, {"code": code.strip()})
        if not r:
            return None
        m_list = r.pop("members", []) or []
        return self._normalize_team(r, m_list)

    def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        query = """
        SELECT t.*, array_agg(tm2.user_id) FILTER (WHERE tm2.user_id IS NOT NULL) AS members
        FROM team_memberships tm
        JOIN teams t ON tm.team_id = t.id
        LEFT JOIN team_memberships tm2 ON t.id = tm2.team_id
        WHERE tm.user_id = :user_id AND t.status = 'active'
        GROUP BY t.id;
        """
        r = self.db.fetch_one(query, {"user_id": user_id})
        if not r:
            return None
        m_list = r.pop("members", []) or []
        return self._normalize_team(r, m_list)

    def add_member(self, team_id: str, user_id: str, max_team_size: int = 5) -> bool:
        """Lock team row, verify capacity, and insert membership atomically."""
        with self.db.connect() as conn:
            # Lock team row
            lock_sql = text("SELECT id, status FROM teams WHERE id = :id FOR UPDATE;")
            team_res = conn.execute(lock_sql, {"id": team_id}).mappings().first()
            if not team_res or team_res["status"] != "active":
                return False

            count_sql = text("SELECT COUNT(*) AS cnt FROM team_memberships WHERE team_id = :team_id;")
            count = conn.execute(count_sql, {"team_id": team_id}).scalar()
            if count >= max_team_size:
                return False

            insert_sql = text("""
            INSERT INTO team_memberships (team_id, user_id, joined_at)
            VALUES (:team_id, :user_id, NOW())
            ON CONFLICT (user_id) DO NOTHING;
            """)
            result = conn.execute(insert_sql, {"team_id": team_id, "user_id": user_id})
            return result.rowcount > 0

    def remove_member(self, team_id: str, user_id: str) -> bool:
        query = "DELETE FROM team_memberships WHERE team_id = :team_id AND user_id = :user_id;"
        res = self.db.execute(query, {"team_id": team_id, "user_id": user_id})
        return res.rowcount > 0

    def transfer_leadership(self, team_id: str, new_leader_id: str) -> bool:
        query = "UPDATE teams SET leader_id = :leader_id WHERE id = :id;"
        res = self.db.execute(query, {"leader_id": new_leader_id, "id": team_id})
        return res.rowcount > 0

    def update_name(self, team_id: str, new_name: str) -> bool:
        query = "UPDATE teams SET name = :name WHERE id = :id;"
        res = self.db.execute(query, {"name": new_name, "id": team_id})
        return res.rowcount > 0

    def regenerate_join_code(self, team_id: str, new_code: str) -> bool:
        query = "UPDATE teams SET join_code = :code WHERE id = :id;"
        res = self.db.execute(query, {"code": new_code, "id": team_id})
        return res.rowcount > 0

    def disband_team(self, team_id: str) -> bool:
        query = "UPDATE teams SET status = 'disbanded' WHERE id = :id;"
        res = self.db.execute(query, {"id": team_id})
        # Remove active memberships
        self.db.execute("DELETE FROM team_memberships WHERE team_id = :id;", {"id": team_id})
        return res.rowcount > 0

