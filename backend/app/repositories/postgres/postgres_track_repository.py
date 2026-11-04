"""CampusCrafters Concrete PostgreSQL Track Repository."""

import json
from typing import Any, Dict, List, Optional
from app.repositories.interfaces.track_repository import ITrackRepository
from app.repositories.postgres.db import PostgresDatabase


class PostgresTrackRepository(ITrackRepository):
    """PostgreSQL adapter for tracks table."""

    def __init__(self, db: PostgresDatabase):
        self.db = db

    def list_all(self) -> List[Dict[str, Any]]:
        query = "SELECT id, name, short_description, detailed_description, accent_color, tags FROM tracks ORDER BY id ASC;"
        rows = self.db.fetch_all(query)
        for r in rows:
            if isinstance(r.get("tags"), str):
                r["tags"] = json.loads(r["tags"])
        return rows

    def get_by_id(self, track_id: str) -> Optional[Dict[str, Any]]:
        query = "SELECT id, name, short_description, detailed_description, accent_color, tags FROM tracks WHERE id = :id;"
        r = self.db.fetch_one(query, {"id": track_id})
        if r and isinstance(r.get("tags"), str):
            r["tags"] = json.loads(r["tags"])
        return r

