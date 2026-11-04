"""CampusCrafters Announcements Endpoints."""

from flask import Blueprint, g, request
from app.security.decorators import optional_auth, require_auth
from app.utils.responses import success_response

announcements_bp = Blueprint("announcements", __name__)


@announcements_bp.route("", methods=["GET"])
@optional_auth
def list_announcements():
    """List announcements with optional category and priority filters."""
    category = request.args.get("category")
    priority = request.args.get("priority")
    user_id = getattr(g, "current_user_id", None)
    announcements = g.announcement_service.list_announcements(
        user_id=user_id, category=category, priority=priority
    )
    return success_response(announcements, 200)


@announcements_bp.route("/<string:id>/read", methods=["POST"])
@require_auth
def mark_read(id: str):
    """Mark announcement as read."""
    result = g.announcement_service.mark_read(g.current_user_id, id)
    return success_response(result, 200)


@announcements_bp.route("/<string:id>/read", methods=["DELETE"])
@require_auth
def mark_unread(id: str):
    """Mark announcement as unread."""
    result = g.announcement_service.mark_unread(g.current_user_id, id)
    return success_response(result, 200)


@announcements_bp.route("/read-all", methods=["POST"])
@require_auth
def mark_all_read():
    """Mark all announcements as read."""
    result = g.announcement_service.mark_all_read(g.current_user_id)
    return success_response(result, 200)

