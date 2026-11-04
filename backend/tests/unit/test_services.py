"""Unit Tests for Domain Services."""

import pytest
from app.errors.exceptions import (
    AuthenticationError,
    MinTeamSizeNotMetError,
    ProblemStatementRequiredError,
    UserAlreadyInTeamError,
)
from app.repositories.memory import (
    MemoryTrackRepository,
    MemoryUserRepository,
    MemoryRegistrationRepository,
    MemoryTeamRepository,
    MemoryProblemRepository,
    MemorySubmissionRepository,
    MemoryAnnouncementRepository,
    MemoryTokenRevocationRepository,
    MemoryEvaluationRepository,
    MemoryEventConfigRepository,
)
from app.services import (
    AuthService,
    RegistrationService,
    TeamService,
    SubmissionService,
    ProblemService,
)


def test_auth_service_invalid_login():
    user_repo = MemoryUserRepository(seed=True)
    token_repo = MemoryTokenRevocationRepository()
    reg_repo = MemoryRegistrationRepository(seed=True)
    team_repo = MemoryTeamRepository(seed=True)

    auth = AuthService(user_repo, token_repo, reg_repo, team_repo)

    with pytest.raises(AuthenticationError):
        auth.dev_login("nonexistent@example.com", "wrongpassword")


def test_team_service_prevents_duplicate_active_team():
    team_repo = MemoryTeamRepository(seed=True)
    user_repo = MemoryUserRepository(seed=True)
    track_repo = MemoryTrackRepository()

    service = TeamService(team_repo, user_repo, track_repo)

    # p-001 is already in team-001
    with pytest.raises(UserAlreadyInTeamError):
        service.create_team("p-001", {"name": "New Team", "track_id": "fintech"})


def test_submission_service_enforces_min_team_size(app):
    with app.app_context():
        sub_repo = MemorySubmissionRepository(seed=False)
        prob_repo = MemoryProblemRepository(seed_selections=False)
        team_repo = MemoryTeamRepository(seed=False)
        config_repo = MemoryEventConfigRepository()

        service = SubmissionService(sub_repo, prob_repo, team_repo, config_repo)

        # Create a team with only 1 member
        team = team_repo.create_team({"name": "Solo Team", "track_id": "fintech"}, creator_id="u-solo")
        prob_repo.save_selection(team["id"], "ps-ft-01", "u-solo")

        # Final submission should fail because min_team_size is 2
        with pytest.raises(MinTeamSizeNotMetError):
            service.submit_final_project(
                team["id"],
                {
                    "project_title": "Solo Project",
                    "short_description": "Valid short description for testing.",
                    "detailed_description": "Valid detailed description that exceeds thirty chars.",
                    "repository_url": "https://github.com/example/repo",
                    "tech_stack": ["Python"],
                },
            )

