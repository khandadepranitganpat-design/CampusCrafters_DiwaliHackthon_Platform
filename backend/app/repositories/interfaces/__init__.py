"""CampusCrafters Abstract Repository Interfaces."""

from app.repositories.interfaces.track_repository import ITrackRepository
from app.repositories.interfaces.user_repository import IUserRepository
from app.repositories.interfaces.registration_repository import IRegistrationRepository
from app.repositories.interfaces.team_repository import ITeamRepository
from app.repositories.interfaces.problem_repository import IProblemRepository
from app.repositories.interfaces.submission_repository import ISubmissionRepository
from app.repositories.interfaces.announcement_repository import IAnnouncementRepository
from app.repositories.interfaces.token_revocation_repository import ITokenRevocationRepository
from app.repositories.interfaces.evaluation_repository import IEvaluationRepository
from app.repositories.interfaces.event_config_repository import IEventConfigRepository

__all__ = [
    "ITrackRepository",
    "IUserRepository",
    "IRegistrationRepository",
    "ITeamRepository",
    "IProblemRepository",
    "ISubmissionRepository",
    "IAnnouncementRepository",
    "ITokenRevocationRepository",
    "IEvaluationRepository",
    "IEventConfigRepository",
]

