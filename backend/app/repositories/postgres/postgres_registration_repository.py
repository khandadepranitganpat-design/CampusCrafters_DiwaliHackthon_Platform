"""CampusCrafters Concrete PostgreSQL Registration Repository."""

import json
from typing import Any, Dict, Optional
from app.repositories.interfaces.registration_repository import IRegistrationRepository
from app.repositories.postgres.db import PostgresDatabase
from app.utils.helpers import generate_id, generate_ticket_code


class PostgresRegistrationRepository(IRegistrationRepository):
    """PostgreSQL adapter for registrations and waitlist tables."""

    def __init__(self, db: PostgresDatabase):
        self.db = db

    def _normalize_row(self, row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not row:
            return None
        out = dict(row)
        if isinstance(out.get("interests"), str):
            out["interests"] = json.loads(out["interests"])
        if out.get("registered_at") and hasattr(out["registered_at"], "strftime"):
            out["registered_at"] = out["registered_at"].strftime("%Y-%m-%dT%H:%M:%SZ")
        if out.get("submitted_at") and hasattr(out["submitted_at"], "strftime"):
            out["submitted_at"] = out["submitted_at"].strftime("%Y-%m-%dT%H:%M:%SZ")
        return out

    def create_registration(self, reg_data: Dict[str, Any]) -> Dict[str, Any]:
        query = """
        INSERT INTO registrations (id, user_id, ticket_code, track_id, experience, interests, rules_accepted, status, registered_at)
        VALUES (:id, :user_id, :ticket_code, :track_id, :experience, :interests, :rules_accepted, :status, NOW())
        RETURNING *;
        """
        reg_id = reg_data.get("id") or generate_id("REG-2026-")
        ticket_code = reg_data.get("ticket_code") or generate_ticket_code()
        interests_json = json.dumps(reg_data.get("interests", []))

        params = {
            "id": reg_id,
            "user_id": reg_data["user_id"],
            "ticket_code": ticket_code,
            "track_id": reg_data["track_id"],
            "experience": reg_data["experience"],
            "interests": interests_json,
            "rules_accepted": reg_data.get("rules_accepted", True),
            "status": reg_data.get("status", "confirmed"),
        }
        return self._normalize_row(self.db.fetch_one(query, params))

    def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM registrations WHERE user_id = :user_id;"
        return self._normalize_row(self.db.fetch_one(query, {"user_id": user_id}))

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        query = """
        SELECT r.* FROM registrations r
        JOIN users u ON r.user_id = u.id
        WHERE LOWER(u.email) = LOWER(:email);
        """
        return self._normalize_row(self.db.fetch_one(query, {"email": email.strip()}))

    def get_by_ticket_code(self, ticket_code: str) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM registrations WHERE ticket_code = :ticket_code;"
        return self._normalize_row(self.db.fetch_one(query, {"ticket_code": ticket_code.strip()}))

    def create_waitlist_entry(self, waitlist_data: Dict[str, Any]) -> Dict[str, Any]:
        query = """
        INSERT INTO waitlist (id, full_name, email, college, track_interest, status, submitted_at)
        VALUES (:id, :full_name, :email, :college, :track_interest, :status, NOW())
        RETURNING *;
        """
        wl_id = waitlist_data.get("id") or generate_id("WL-")
        params = {
            "id": wl_id,
            "full_name": waitlist_data["full_name"],
            "email": waitlist_data["email"].strip().lower(),
            "college": waitlist_data.get("college"),
            "track_interest": waitlist_data.get("track_interest", "any"),
            "status": "waitlisted",
        }
        return self._normalize_row(self.db.fetch_one(query, params))

