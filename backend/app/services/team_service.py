"""CampusCrafters Team Management Service."""

from typing import Any, Dict, List, Optional
from flask import current_app

from app.errors.exceptions import (
    ConflictError,
    JoinCodeInvalidError,
    LeaderCannotLeaveError,
    NotFoundError,
    TeamCapacityExceededError,
    UserAlreadyInTeamError,
    AuthorizationError,
)
from app.repositories.interfaces.team_repository import ITeamRepository
from app.repositories.interfaces.user_repository import IUserRepository
from app.repositories.interfaces.track_repository import ITrackRepository
from app.utils.helpers import generate_join_code


class TeamService:
    """Encapsulates team creation, joins, roster mutations, and capacity invariants."""

    def __init__(
        self,
        team_repo: ITeamRepository,
        user_repo: IUserRepository,
        track_repo: ITrackRepository,
    ):
        self.team_repo = team_repo
        self.user_repo = user_repo
        self.track_repo = track_repo

    def list_teams(self, track_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """List active teams directory."""
        max_size = current_app.config.get("MAX_TEAM_SIZE", 5)
        raw_teams = self.team_repo.list_all(track_id=track_id, status=status or "active")
        result = []
        for t in raw_teams:
            track = self.track_repo.get_by_id(t.get("track_id", ""))
            member_count = len(t.get("member_ids", []))
            result.append({
                "id": t["id"],
                "name": t["name"],
                "track_id": t["track_id"],
                "track_name": track.get("name", t["track_id"]) if track else t["track_id"],
                "leader_id": t["leader_id"],
                "member_count": member_count,
                "max_members": max_size,
                "is_full": member_count >= max_size,
                "status": t.get("status", "active"),
                "created_at": t.get("created_at"),
            })
        return result

    def create_team(self, creator_id: str, team_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new team with creator as initial member."""
        existing = self.team_repo.get_by_user_id(creator_id)
        if existing:
            raise UserAlreadyInTeamError("You already belong to an active team. Leave your current team first.")

        track_id = team_data.get("track_id", "")
        track = self.track_repo.get_by_id(track_id)
        if not track:
            raise NotFoundError(f"Track '{track_id}' not found.")

        created = self.team_repo.create_team(team_data, creator_id)
        return {
            "id": created["id"],
            "name": created["name"],
            "join_code": created["join_code"],
            "track_id": created["track_id"],
            "leader_id": created["leader_id"],
            "member_ids": created.get("member_ids", [creator_id]),
            "created_at": created["created_at"],
            "status": created["status"],
        }

    def get_user_team(self, user_id: str) -> Dict[str, Any]:
        """Get the active team for the authenticated user with member profiles."""
        team = self.team_repo.get_by_user_id(user_id)
        if not team:
            raise NotFoundError("User is not currently in any active team.")

        max_size = current_app.config.get("MAX_TEAM_SIZE", 5)
        track = self.track_repo.get_by_id(team.get("track_id", ""))

        members_detail = []
        for m_id in team.get("member_ids", []):
            u = self.user_repo.get_by_id(m_id)
            if u:
                d_name = u.get("display_name", "")
                initials = "".join([part[0].upper() for part in d_name.split() if part])[:2] or "U"
                members_detail.append({
                    "id": u["id"],
                    "display_name": d_name,
                    "email": u.get("email", ""),
                    "college": u.get("college", ""),
                    "skills": u.get("skills", []),
                    "avatar_initials": initials,
                    "avatar_color": "#2B50FF",
                    "is_leader": u["id"] == team["leader_id"],
                })

        return {
            "id": team["id"],
            "name": team["name"],
            "join_code": team["join_code"],
            "track_id": team["track_id"],
            "track_name": track.get("name", team["track_id"]) if track else team["track_id"],
            "leader_id": team["leader_id"],
            "is_leader": team["leader_id"] == user_id,
            "member_ids": team.get("member_ids", []),
            "members": members_detail,
            "max_members": max_size,
            "is_full": len(team.get("member_ids", [])) >= max_size,
            "status": team.get("status", "active"),
            "created_at": team.get("created_at"),
        }

    def join_team(self, user_id: str, join_code: str) -> Dict[str, Any]:
        """Join a team via uppercase join code (supports both CC-4F7K and CS-XXXX)."""
        existing = self.team_repo.get_by_user_id(user_id)
        if existing:
            raise UserAlreadyInTeamError("You already belong to an active team. Leave it first before joining another.")

        team = self.team_repo.get_by_join_code(join_code)
        if not team:
            raise JoinCodeInvalidError("Join code does not match any active team.")

        max_size = current_app.config.get("MAX_TEAM_SIZE", 5)
        member_count = len(team.get("member_ids", []))
        if member_count >= max_size:
            raise TeamCapacityExceededError(
                f"Team '{team['name']}' has reached the maximum capacity of {max_size} members."
            )

        success = self.team_repo.add_member(team["id"], user_id, max_team_size=max_size)
        if not success:
            raise TeamCapacityExceededError("Could not join team. Maximum capacity reached or team disbanded.")

        updated_team = self.team_repo.get_by_id(team["id"])
        return {
            "id": updated_team["id"],
            "name": updated_team["name"],
            "member_ids": updated_team.get("member_ids", []),
            "status": updated_team.get("status", "active"),
        }

    def leave_team(self, user_id: str) -> bool:
        """Leave current team. Leaders must transfer leadership first unless sole member."""
        team = self.team_repo.get_by_user_id(user_id)
        if not team:
            raise NotFoundError("You do not belong to any active team.")

        member_ids = team.get("member_ids", [])
        is_leader = team["leader_id"] == user_id

        if is_leader:
            if len(member_ids) > 1:
                raise LeaderCannotLeaveError(
                    "You cannot leave the team as leader while other members are present. Transfer leadership first or disband the team."
                )
            # Sole member leaving -> disband automatically
            return self.team_repo.disband_team(team["id"])

        return self.team_repo.remove_member(team["id"], user_id)

    def rename_team(self, team_id: str, new_name: str) -> Dict[str, Any]:
        """Rename team."""
        success = self.team_repo.update_name(team_id, new_name)
        if not success:
            raise NotFoundError("Team not found.")
        team = self.team_repo.get_by_id(team_id)
        return {
            "id": team["id"],
            "name": team["name"],
            "status": team["status"],
        }

    def regenerate_join_code(self, team_id: str) -> str:
        """Generate a new CS-XXXX join code for the team."""
        new_code = generate_join_code()
        success = self.team_repo.regenerate_join_code(team_id, new_code)
        if not success:
            raise NotFoundError("Team not found.")
        return new_code

    def remove_member(self, team_id: str, leader_id: str, target_user_id: str) -> Dict[str, Any]:
        """Remove member from team."""
        if leader_id == target_user_id:
            raise AuthorizationError("Team leader cannot remove themselves. Use leave or disband.")

        team = self.team_repo.get_by_id(team_id)
        if not team:
            raise NotFoundError("Team not found.")

        if target_user_id not in team.get("member_ids", []):
            raise NotFoundError("Target user is not a member of this team.")

        self.team_repo.remove_member(team_id, target_user_id)
        updated = self.team_repo.get_by_id(team_id)
        return {
            "id": updated["id"],
            "member_ids": updated.get("member_ids", []),
            "status": updated["status"],
        }

    def transfer_leadership(self, team_id: str, current_leader_id: str, new_leader_id: str) -> Dict[str, Any]:
        """Transfer leadership to another member."""
        team = self.team_repo.get_by_id(team_id)
        if not team:
            raise NotFoundError("Team not found.")

        if new_leader_id not in team.get("member_ids", []):
            raise NotFoundError("New leader must be an existing member of the team.")

        self.team_repo.transfer_leadership(team_id, new_leader_id)
        updated = self.team_repo.get_by_id(team_id)
        return {
            "id": updated["id"],
            "leader_id": updated["leader_id"],
            "status": updated["status"],
        }

    def disband_team(self, team_id: str) -> bool:
        """Disband team."""
        return self.team_repo.disband_team(team_id)

