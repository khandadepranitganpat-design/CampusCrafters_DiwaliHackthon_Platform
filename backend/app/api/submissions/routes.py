"""CampusCrafters Submission Endpoints."""

from flask import Blueprint, g, request
from app.security.decorators import require_auth, require_team_leader, require_team_member_or_staff
from app.schemas.submission_schemas import SubmissionDraftSchema, SubmissionFinalSchema
from app.utils.responses import success_response

submissions_bp = Blueprint("submissions", __name__)


@submissions_bp.route("/teams/<string:id>/submission", methods=["GET"])
@require_auth
@require_team_member_or_staff
def get_submission(id: str):
    """Retrieve submission record for team."""
    submission = g.submission_service.get_team_submission(id)
    return success_response(submission, 200)


@submissions_bp.route("/teams/<string:id>/submission/draft", methods=["PUT"])
@require_auth
@require_team_leader
def save_draft(id: str):
    """Auto-save submission draft with partial payloads."""
    data = SubmissionDraftSchema().load(request.get_json() or {})
    result = g.submission_service.save_draft(id, data)
    return success_response(result, 200)


@submissions_bp.route("/teams/<string:id>/submission/submit", methods=["POST"])
@require_auth
@require_team_leader
def submit_project(id: str):
    """Final project submission with completeness and MIN_TEAM_SIZE enforcement."""
    data = SubmissionFinalSchema().load(request.get_json() or {})
    result = g.submission_service.submit_final_project(id, data)
    return success_response(result, 200)

