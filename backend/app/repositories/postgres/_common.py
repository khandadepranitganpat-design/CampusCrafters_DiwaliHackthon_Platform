"""Shared helpers for PostgreSQL repository adapters."""

import json
from datetime import datetime
from typing import Any, Dict, Iterable, Optional


def iso_utc(value: Any) -> Any:
    """Render a datetime as ISO 8601 UTC with trailing Z; pass other values through."""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%dT%H:%M:%SZ")
    return value


def normalize_timestamps(row: Optional[Dict[str, Any]], keys: Iterable[str]) -> Optional[Dict[str, Any]]:
    """Return a copy of row with the given timestamp columns converted via iso_utc."""
    if row is None:
        return None
    out = dict(row)
    for k in keys:
        if k in out:
            out[k] = iso_utc(out[k])
    return out


def load_json(value: Any, default: Any = None) -> Any:
    """Decode a JSON column that may arrive as str (older drivers) or already-decoded."""
    if value is None:
        return default
    if isinstance(value, (str, bytes)):
        return json.loads(value)
    return value
