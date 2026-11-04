"""CampusCrafters Thread-safe In-Memory Track Repository."""

import threading
from typing import Any, Dict, List, Optional
from app.repositories.interfaces.track_repository import ITrackRepository
from app.repositories.memory.seed_data import PRODUCTION_TRACKS


class MemoryTrackRepository(ITrackRepository):
    """Thread-safe in-memory adapter for tracks."""

    def __init__(self, initial_data: Optional[List[Dict[str, Any]]] = None):
        self._lock = threading.RLock()
        self._tracks: Dict[str, Dict[str, Any]] = {}
        data = initial_data if initial_data is not None else PRODUCTION_TRACKS
        for t in data:
            self._tracks[t["id"]] = dict(t)

    def list_all(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [dict(t) for t in self._tracks.values()]

    def get_by_id(self, track_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            t = self._tracks.get(track_id)
            return dict(t) if t else None

