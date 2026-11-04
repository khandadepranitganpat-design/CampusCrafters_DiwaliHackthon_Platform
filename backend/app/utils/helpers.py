"""CampusCrafters Backend Utility Helpers."""

import random
import string
import uuid
from datetime import datetime, timezone
from typing import Optional


def generate_id(prefix: str = "") -> str:
    """Generate a clean unique identifier."""
    uid = uuid.uuid4().hex[:8]
    return f"{prefix}{uid}" if prefix else uid


def generate_join_code() -> str:
    """Generate a new team join code following the CS-XXXX standard.
    
    Uses uppercase alphanumeric characters (excluding ambiguous characters like 0/O, 1/I).
    """
    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    suffix = "".join(random.choice(chars) for _ in range(4))
    return f"CS-{suffix}"


def generate_ticket_code() -> str:
    """Generate a ticket pass code following the CS26-XXXX-XXXX standard."""
    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    part1 = "".join(random.choice(chars) for _ in range(4))
    part2 = "".join(random.choice(chars) for _ in range(4))
    return f"CS26-{part1}-{part2}"


def utc_now() -> str:
    """Return the current time formatted as ISO 8601 UTC ending in Z."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_utc_timestamp(val: Optional[str]) -> Optional[datetime]:
    """Parse an ISO 8601 UTC timestamp string ending in Z or with offset."""
    if not val:
        return None
    val_clean = val.strip()
    if val_clean.endswith("Z"):
        val_clean = val_clean[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(val_clean)
    except Exception:
        return None

