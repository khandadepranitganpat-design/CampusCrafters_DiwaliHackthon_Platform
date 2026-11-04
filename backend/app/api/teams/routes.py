"""CampusCrafters Team Management Endpoints."""

from flask import Blueprint, g, request
from app.security.decorators import require_auth, require_team_leader, require_registered, require_team_member_or_staff
from app.schemas.team_schemas import (
    TeamCreateSchema,
    TeamJoinSchema,
    TeamRenameSchema,
    TransferLeadershipSchema,
)
from app.schemas.problem_schemas import ProblemSelectSchema
from app.utils.responses import success_response

teams_bp = Blueprint("teams", __name__)


@teams_bp.route("", methods=["GET"])
def list_teams():
    """List teams directory with optional filters."""
    track_id = request.args.get("track_id")
    status = request.args.get("status", "active")
    teams = g.team_service.list_teams(track_id=track_id, status=status)
    return success_response(teams, 200)


@teams_bp.route("", methods=["POST"])
@require_auth
@require_registered
def create_team():
    """Create a new team with creator as first member."""
    data = TeamCreateSchema().load(request.get_json() or {})
    result = g.team_service.create_team(g.current_user_id, data)
    return success_response(result, 201)


@teams_bp.route("/me", methods=["GET"])
@require_auth
def get_my_team():
    """Get authenticated user's current team."""
    team = g.team_service.get_user_team(g.current_user_id)
    return success_response(team, 200)


@teams_bp.route("/join", methods=["POST"])
@require_auth
@require_registered
def join_team():
    """Join team via uppercase join code."""
    data = TeamJoinSchema().load(request.get_json() or {})
    result = g.team_service.join_team(g.current_user_id, data["join_code"])
    return success_response(result, 200)


@teams_bp.route("/leave", methods=["POST"])
@require_auth
def leave_team():
    """Leave current team."""
    g.team_service.leave_team(g.current_user_id)
    return success_response({"message": "Left team successfully."}, 200)


@teams_bp.route("/<string:id>/name", methods=["PATCH"])
@require_auth
@require_team_leader
def rename_team(id: str):
    """Rename team."""
    data = TeamRenameSchema().load(request.get_json() or {})
    result = g.team_service.rename_team(id, data["name"])
    return success_response(result, 200)


@teams_bp.route("/<string:id>/regenerate-code", methods=["POST"])
@require_auth
@require_team_leader
def regenerate_join_code(id: str):
    """Regenerate team join code."""
    new_code = g.team_service.regenerate_join_code(id)
    return success_response({"join_code": new_code}, 200)


@teams_bp.route("/<string:id>/members/<string:user_id>", methods=["DELETE"])
@require_auth
@require_team_leader
def remove_member(id: str, user_id: str):
    """Remove member from team."""
    result = g.team_service.remove_member(id, g.current_user_id, user_id)
    return success_response(result, 200)


@teams_bp.route("/<string:id>/transfer-leadership", methods=["POST"])
@require_auth
@require_team_leader
def transfer_leadership(id: str):
    """Transfer team leadership to another member."""
    data = TransferLeadershipSchema().load(request.get_json() or {})
    result = g.team_service.transfer_leadership(id, g.current_user_id, data["new_leader_id"])
    return success_response(result, 200)


@teams_bp.route("/<string:id>", methods=["DELETE"])
@require_auth
@require_team_leader
def disband_team(id: str):
    """Disband team."""
    g.team_service.disband_team(id)
    return success_response({"message": "Team disbanded successfully."}, 200)


@teams_bp.route("/<string:id>/problem-statement", methods=["GET"])
@require_auth
@require_team_member_or_staff
def get_team_problem_statement(id: str):
    """Get team's selected problem statement."""
    selection = g.problem_service.get_team_selection(id)
    return success_response(selection, 200)


@teams_bp.route("/<string:id>/problem-statement", methods=["PUT"])
@require_auth
@require_team_leader
def select_problem_statement(id: str):
    """Select or update team problem statement."""
    data = ProblemSelectSchema().load(request.get_json() or {})
    result = g.problem_service.select_problem(id, g.current_user_id, data["problem_statement_id"])
    return success_response(result, 200)


@teams_bp.route("/<string:id>/problem-statement", methods=["DELETE"])
@require_auth
@require_team_leader
def clear_problem_statement(id: str):
    """Clear team problem statement selection."""
    g.problem_service.clear_problem_selection(id)
    return success_response({"message": "Problem statement selection cleared."}, 200)
