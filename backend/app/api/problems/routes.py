"""CampusCrafters Tracks & Problem Statements Endpoints."""

from flask import Blueprint, g, request
from app.utils.responses import success_response

problems_bp = Blueprint("problems", __name__)


@problems_bp.route("/tracks", methods=["GET"])
def list_tracks():
    """List all available hackathon competition tracks."""
    tracks = g.problem_service.list_tracks()
    return success_response(tracks, 200)


@problems_bp.route("/problem-statements", methods=["GET"])
def list_problem_statements():
    """List active problem statements with optional filters."""
    track_id = request.args.get("track") or request.args.get("track_id")
    difficulty = request.args.get("difficulty")
    search = request.args.get("search")
    problems = g.problem_service.list_problem_statements(
        track_id=track_id, difficulty=difficulty, search=search
    )
    return success_response(problems, 200)


@problems_bp.route("/problem-statements/<string:id>", methods=["GET"])
def get_problem_statement(id: str):
    """Get complete details for a specific problem statement."""
    problem = g.problem_service.get_problem_statement(id)
    return success_response(problem, 200)

