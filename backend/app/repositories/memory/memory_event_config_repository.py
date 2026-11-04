"""CampusCrafters Thread-safe In-Memory Event Config Repository."""

import threading
from datetime import datetime
from typing import Any, Dict, Optional
from app.repositories.interfaces.event_config_repository import IEventConfigRepository
from app.repositories.memory.seed_data import PRODUCTION_EVENT_CONFIG
from app.utils.event_states import derived_state_fields


class MemoryEventConfigRepository(IEventConfigRepository):
    """Thread-safe in-memory adapter for global event config."""

    def __init__(self, initial_config: Optional[Dict[str, Any]] = None):
        self._lock = threading.RLock()
        self._config = dict(initial_config if initial_config is not None else PRODUCTION_EVENT_CONFIG)

    def get_config(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._config)

    def set_event_state(self, new_state: str, updated_by: Optional[str] = None) -> bool:
        with self._lock:
            self._config["event_state"] = new_state
            derived = derived_state_fields(new_state)
            if derived:
                self._config.update(derived)
            return True

    def set_submission_deadline(self, deadline_utc: Optional[datetime], updated_by: Optional[str] = None) -> bool:
        with self._lock:
            self._config["submission_deadline_utc"] = (
                deadline_utc.strftime("%Y-%m-%dT%H:%M:%SZ") if deadline_utc else None
            )
            return True

