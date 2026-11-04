"""CampusCrafters Administrative Endpoints."""

from flask import Blueprint, g, request
from app.security.decorators import require_auth, require_role
from app.schemas.admin_schemas import AdminEventStateSchema, AdminDeadlineSchema, AdminProblemToggleSchema
from app.schemas.announcement_schemas import AnnouncementCreateSchema
from app.utils.responses import success_response

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/event-state", methods=["PATCH"])
@require_auth
@require_role("admin")
def update_event_state():
    """Admin override of global event state."""
    data = AdminEventStateSchema().load(request.get_json() or {})
    result = g.event_config_service.set_event_state(data["event_state"], g.current_user_id)
    return success_response(result, 200)


@admin_bp.route("/announcements", methods=["POST"])
@require_auth
@require_role("admin")
def create_announcement():
    """Admin broadcast of flash announcement."""
    data = AnnouncementCreateSchema().load(request.get_json() or {})
    created = g.announcement_service.create_announcement(data)
    return success_response(created, 201)


@admin_bp.route("/deadline", methods=["PATCH"])
@require_auth
@require_role("admin")
def update_deadline():
    """Admin override of submission deadline."""
    data = AdminDeadlineSchema().load(request.get_json() or {})
    result = g.event_config_service.set_submission_deadline(data["submission_deadline_utc"], g.current_user_id)
    return success_response(result, 200)


@admin_bp.route("/problem-statements/<string:id>/toggle", methods=["PATCH"])
@require_auth
@require_role("admin")
def toggle_problem_statement(id: str):
    """Admin toggle for problem statement activation."""
    data = AdminProblemToggleSchema().load(request.get_json() or {})
    result = g.event_config_service.toggle_problem_status(id, data["is_active"])
    return success_response(result, 200)

