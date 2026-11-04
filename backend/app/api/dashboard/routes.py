"""CampusCrafters Dashboard & Health Endpoints."""

from flask import Blueprint, current_app, g
from app.utils.helpers import utc_now
from app.utils.responses import success_response

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/health", methods=["GET"])
def health_check():
    """System health check endpoint."""
    payload = {
        "status": "healthy",
        "environment": current_app.config.get("ENV", "development"),
        "timestamp": utc_now(),
    }
    db = getattr(current_app, "db", None)
    if db is not None:
        try:
            db.fetch_one("SELECT 1 AS ok;")
            payload["database"] = "ok"
        except Exception:  # noqa: BLE001 - any driver failure means the DB is unusable
            current_app.logger.exception("Health check: database unreachable")
            payload["status"] = "unhealthy"
            payload["database"] = "unreachable"
            return success_response(payload, 503)
    return success_response(payload, 200)


@dashboard_bp.route("/config/state", methods=["GET"])
def get_config_state():
    """Global event configuration and lifecycle state snapshot."""
    state_data = g.event_config_service.get_public_state()
    return success_response(state_data, 200)

