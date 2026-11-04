"""CampusCrafters Concrete PostgreSQL User Repository."""

import json
from typing import Any, Dict, Optional
from app.repositories.interfaces.user_repository import IUserRepository
from app.repositories.postgres.db import PostgresDatabase
from app.utils.helpers import utc_now


class PostgresUserRepository(IUserRepository):
    """PostgreSQL adapter for users table."""

    def __init__(self, db: PostgresDatabase):
        self.db = db

    def _normalize_row(self, row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not row:
            return None
        out = dict(row)
        if isinstance(out.get("skills"), str):
            out["skills"] = json.loads(out["skills"])
        if out.get("created_at") and hasattr(out["created_at"], "strftime"):
            out["created_at"] = out["created_at"].strftime("%Y-%m-%dT%H:%M:%SZ")
        if out.get("updated_at") and hasattr(out["updated_at"], "strftime"):
            out["updated_at"] = out["updated_at"].strftime("%Y-%m-%dT%H:%M:%SZ")
        return out

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM users WHERE id = :id;"
        return self._normalize_row(self.db.fetch_one(query, {"id": user_id}))

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM users WHERE LOWER(email) = LOWER(:email);"
        return self._normalize_row(self.db.fetch_one(query, {"email": email.strip()}))

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        query = """
        INSERT INTO users (id, email, display_name, college, course, year, phone, bio, skills, roles, password_hash, created_at, updated_at)
        VALUES (:id, :email, :display_name, :college, :course, :year, :phone, :bio, :skills, :roles, :password_hash, NOW(), NOW())
        RETURNING *;
        """
        skills_json = json.dumps(user_data.get("skills", []))
        roles = user_data.get("roles", ["participant"])
        params = {
            "id": user_data["id"],
            "email": user_data["email"].strip().lower(),
            "display_name": user_data["display_name"],
            "college": user_data.get("college", ""),
            "course": user_data.get("course"),
            "year": user_data.get("year"),
            "phone": user_data.get("phone"),
            "bio": user_data.get("bio", ""),
            "skills": skills_json,
            "roles": roles,
            "password_hash": user_data.get("password_hash"),
        }
        return self._normalize_row(self.db.fetch_one(query, params))

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        set_clauses = []
        params: Dict[str, Any] = {"id": user_id}

        for k, v in updates.items():
            if k in ("display_name", "college", "course", "year", "phone", "bio"):
                set_clauses.append(f"{k} = :{k}")
                params[k] = v
            elif k == "skills":
                set_clauses.append("skills = :skills")
                params["skills"] = json.dumps(v)
            elif k == "roles":
                set_clauses.append("roles = :roles")
                params["roles"] = v

        if not set_clauses:
            return self.get_by_id(user_id)

        set_clauses.append("updated_at = NOW()")
        query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = :id RETURNING *;"
        return self._normalize_row(self.db.fetch_one(query, params))

