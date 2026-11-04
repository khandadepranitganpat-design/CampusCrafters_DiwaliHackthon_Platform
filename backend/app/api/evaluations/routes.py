"""CampusCrafters Evaluator & Scoring Endpoints."""

from flask import Blueprint, g, request
from app.security.decorators import require_auth, require_role
from app.schemas.evaluation_schemas import EvaluationScoreSchema
from app.utils.responses import success_response

evaluations_bp = Blueprint("evaluations", __name__)


@evaluations_bp.route("/submissions", methods=["GET"])
@require_auth
@require_role("judge", "admin")
def list_submissions_for_evaluation():
    """List submitted projects ready for judging."""
    track_id = request.args.get("track_id")
    submissions = g.evaluation_service.list_submissions_for_judge(g.current_user_id, track_id=track_id)
    return success_response(submissions, 200)


@evaluations_bp.route("/submissions/<string:id>", methods=["GET"])
@require_auth
@require_role("judge", "admin")
def get_submission_evaluation_detail(id: str):
    """Get submission details and judge's score."""
    detail = g.evaluation_service.get_submission_detail_for_judge(id, g.current_user_id)
    return success_response(detail, 200)


@evaluations_bp.route("/submissions/<string:id>/scores", methods=["POST"])
@require_auth
@require_role("judge", "admin")
def submit_evaluation_score(id: str):
    """Submit or update evaluation score (upsert). Total score computed on server."""
    data = EvaluationScoreSchema().load(request.get_json() or {})
    result = g.evaluation_service.submit_score(id, g.current_user_id, data)
    return success_response(result, 200)

