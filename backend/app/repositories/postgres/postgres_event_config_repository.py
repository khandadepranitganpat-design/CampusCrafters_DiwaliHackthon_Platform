"""CampusCrafters Concrete PostgreSQL Event Config Repository."""

import json
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import text

from app.repositories.interfaces.event_config_repository import IEventConfigRepository
from app.repositories.postgres.db import PostgresDatabase
from app.utils.event_states import DEFAULT_EVENT_CONFIG, derived_state_fields


class PostgresEventConfigRepository(IEventConfigRepository):
    """PostgreSQL adapter over the event_config key/value table.

    Missing keys fall back to DEFAULT_EVENT_CONFIG so a freshly migrated, unseeded
    database still serves a coherent public state.
    """

    def __init__(self, db: PostgresDatabase):
        self.db = db

    def get_config(self) -> Dict[str, Any]:
        config = dict(DEFAULT_EVENT_CONFIG)
        for row in self.db.fetch_all("SELECT key, value FROM event_config;"):
            # psycopg2 already decodes JSONB (including scalar strings like "reg_open").
            config[row["key"]] = row["value"]
        return config

    def _upsert(self, conn_exec, key: str, value: Any, updated_by: Optional[str]) -> None:
        conn_exec(
            """
            INSERT INTO event_config (key, value, updated_at, updated_by)
            VALUES (:key, CAST(:value AS JSONB), NOW(), :updated_by)
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by;
            """,
            {"key": key, "value": json.dumps(value), "updated_by": updated_by},
        )

    def set_event_state(self, new_state: str, updated_by: Optional[str] = None) -> bool:
        derived = derived_state_fields(new_state)
        if derived is None:
            return False
        with self.db.connect() as conn:
            def run(sql, params):
                conn.execute(text(sql), params)

            self._upsert(run, "event_state", new_state, updated_by)
            for key, value in derived.items():
                self._upsert(run, key, value, updated_by)
        return True

    def set_submission_deadline(self, deadline_utc: Optional[datetime], updated_by: Optional[str] = None) -> bool:
        value = deadline_utc.strftime("%Y-%m-%dT%H:%M:%SZ") if deadline_utc else None
        with self.db.connect() as conn:
            self._upsert(lambda sql, params: conn.execute(text(sql), params), "submission_deadline_utc", value, updated_by)
        return True
