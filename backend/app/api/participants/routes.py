"""CampusCrafters Profile / Participants Endpoints."""

from flask import Blueprint, g, request
from app.security.decorators import require_auth
from app.schemas.profile_schemas import ProfileUpdateSchema
from app.utils.responses import success_response

participants_bp = Blueprint("participants", __name__)


@participants_bp.route("/me", methods=["GET"])
@require_auth
def get_profile():
    """Get active participant profile details."""
    profile = g.user_service.get_profile(g.current_user_id)
    return success_response(profile, 200)


@participants_bp.route("/me", methods=["PUT"])
@require_auth
def update_profile():
    """Update editable profile details."""
    data = ProfileUpdateSchema().load(request.get_json() or {})
    updated = g.user_service.update_profile(g.current_user_id, data)
    return success_response(updated, 200)

