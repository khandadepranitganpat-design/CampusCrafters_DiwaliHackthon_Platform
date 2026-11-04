"""CampusCrafters Registration Endpoints."""

from flask import Blueprint, g, request
from app.security.decorators import require_auth
from app.schemas.registration_schemas import RegistrationSubmitSchema, WaitlistSubmitSchema
from app.utils.responses import success_response

registrations_bp = Blueprint("registrations", __name__)


@registrations_bp.route("", methods=["POST"])
@require_auth
def submit_registration():
    """Submit official hackathon registration."""
    data = RegistrationSubmitSchema().load(request.get_json() or {})
    result = g.registration_service.submit_registration(g.current_user_id, data)
    return success_response(result, 201)


@registrations_bp.route("/me", methods=["GET"])
@require_auth
def get_my_registration():
    """Get active participant ticket pass and registration record."""
    result = g.registration_service.get_user_registration(g.current_user_id)
    return success_response(result, 200)


@registrations_bp.route("/waitlist", methods=["POST"])
def submit_waitlist():
    """Submit waitlist application when event state is full."""
    data = WaitlistSubmitSchema().load(request.get_json() or {})
    result = g.registration_service.submit_waitlist(data)
    return success_response(result, 201)

