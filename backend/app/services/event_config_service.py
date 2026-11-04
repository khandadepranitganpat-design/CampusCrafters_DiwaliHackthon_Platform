"""CampusCrafters Event State & Configuration Service."""

from datetime import datetime
from typing import Any, Dict, Optional
from flask import current_app

from app.repositories.interfaces.event_config_repository import IEventConfigRepository
from app.repositories.interfaces.problem_repository import IProblemRepository
from app.utils.helpers import parse_utc_timestamp


class EventConfigService:
    """Encapsulates global hackathon state, deadlines, and administrative controls."""

    def __init__(self, config_repo: IEventConfigRepository, problem_repo: IProblemRepository):
        self.config_repo = config_repo
        self.problem_repo = problem_repo

    def get_public_state(self) -> Dict[str, Any]:
        """Get public global state snapshot."""
        cfg = self.config_repo.get_config()
        min_team = current_app.config.get("MIN_TEAM_SIZE", 2)
        max_team = current_app.config.get("MAX_TEAM_SIZE", 5)

        return {
            "event_state": cfg.get("event_state", "reg_open"),
            "label": cfg.get("label", "Registration Open"),
            "description": cfg.get("description", "Registration is open. Secure your spot now."),
            "cta_label": cfg.get("cta_label", "Register with CampusCrafters"),
            "cta_enabled": cfg.get("cta_enabled", True),
            "config": {
                "min_team_size": min_team,
                "max_team_size": max_team,
                "allow_solo": cfg.get("allow_solo", False),
                "allow_problem_change": cfg.get("allow_problem_change", True),
                "submission_deadline_utc": cfg.get("submission_deadline_utc"),
            },
        }

    def set_event_state(self, new_state: str, admin_user_id: str) -> Dict[str, Any]:
        """Admin override of event state."""
        self.config_repo.set_event_state(new_state, updated_by=admin_user_id)
        from app.utils.helpers import utc_now

        return {
            "event_state": new_state,
            "updated_at": utc_now(),
        }

    def set_submission_deadline(self, deadline_str: Optional[str], admin_user_id: str) -> Dict[str, Any]:
        """Admin override of submission deadline."""
        deadline_dt = parse_utc_timestamp(deadline_str) if deadline_str else None
        self.config_repo.set_submission_deadline(deadline_dt, updated_by=admin_user_id)
        from app.utils.helpers import utc_now

        return {
            "submission_deadline_utc": deadline_str,
            "updated_at": utc_now(),
        }

    def toggle_problem_status(self, problem_id: str, is_active: bool) -> Dict[str, Any]:
        """Admin toggle for problem statement activation."""
        from app.errors.exceptions import NotFoundError
        from app.utils.helpers import utc_now

        success = self.problem_repo.update_active_status(problem_id, is_active)
        if not success:
            raise NotFoundError(f"Problem statement '{problem_id}' not found.")
        return {
            "id": problem_id,
            "is_active": is_active,
            "updated_at": utc_now(),
        }

