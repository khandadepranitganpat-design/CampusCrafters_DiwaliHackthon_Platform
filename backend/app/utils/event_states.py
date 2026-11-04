"""Event lifecycle state metadata shared by every event-config repository adapter."""

from typing import Any, Dict, Optional, Tuple

# state -> (label, description, cta_enabled)
EVENT_STATE_META: Dict[str, Tuple[str, str, bool]] = {
    "teaser": ("Teaser", "Event teaser live. Stay tuned.", False),
    "reg_open": ("Registration Open", "Registration is open. Secure your spot now.", True),
    "almost_full": ("Almost Full", "Few spots left in registration.", True),
    "full": ("Full", "Registration cap reached. Waitlist is active.", False),
    "reg_closed": ("Registration Closed", "Registrations have closed.", False),
    "event_live": ("Event Live", "Hackathon is underway! Build and innovate.", False),
    "judging": ("Judging", "Submissions locked. Judging and evaluations in progress.", False),
    "results": ("Results Announced", "Diwali Hackathon winners declared!", False),
}

VALID_EVENT_STATES = tuple(EVENT_STATE_META.keys())

DEFAULT_EVENT_CONFIG: Dict[str, Any] = {
    "event_state": "reg_open",
    "label": "Registration Open",
    "description": "Registration is open. Secure your spot now.",
    "cta_label": "Register with CampusCrafters",
    "cta_enabled": True,
    "min_team_size": 2,
    "max_team_size": 5,
    "allow_solo": False,
    "allow_problem_change": True,
    "submission_deadline_utc": None,
}


def derived_state_fields(new_state: str) -> Optional[Dict[str, Any]]:
    """Return label/description/cta_enabled fields implied by a state, or None if unknown."""
    meta = EVENT_STATE_META.get(new_state)
    if not meta:
        return None
    label, description, cta_enabled = meta
    return {"label": label, "description": description, "cta_enabled": cta_enabled}
