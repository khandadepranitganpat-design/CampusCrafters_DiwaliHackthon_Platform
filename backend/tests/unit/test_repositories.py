"""Unit Tests for In-Memory Repositories."""

from app.repositories.memory import (
    MemoryTrackRepository,
    MemoryUserRepository,
    MemoryTeamRepository,
    MemoryProblemRepository,
    MemorySubmissionRepository,
    MemoryAnnouncementRepository,
    MemoryTokenRevocationRepository,
    MemoryEvaluationRepository,
    MemoryEventConfigRepository,
)


def test_track_repository_list_and_get():
    repo = MemoryTrackRepository()
    tracks = repo.list_all()
    assert len(tracks) >= 4
    fintech = repo.get_by_id("fintech")
    assert fintech is not None
    assert fintech["name"] == "FinTech"


def test_user_repository_crud():
    repo = MemoryUserRepository(seed=False)
    user = repo.create_user({
        "id": "u-test-1",
        "email": "test@example.com",
        "display_name": "Test User",
        "college": "Test College",
    })
    assert user["id"] == "u-test-1"

    found = repo.get_by_email("TEST@example.com")
    assert found is not None
    assert found["display_name"] == "Test User"

    updated = repo.update_user("u-test-1", {"bio": "Updated bio"})
    assert updated["bio"] == "Updated bio"


def test_team_repository_capacity_and_members():
    repo = MemoryTeamRepository(seed=False)
    team = repo.create_team({"name": "Alpha Team", "track_id": "fintech"}, creator_id="u-1")
    team_id = team["id"]
    assert len(team["member_ids"]) == 1

    # Add members up to max 3
    added_2 = repo.add_member(team_id, "u-2", max_team_size=3)
    added_3 = repo.add_member(team_id, "u-3", max_team_size=3)
    assert added_2 is True
    assert added_3 is True

    # Over capacity should fail
    added_4 = repo.add_member(team_id, "u-4", max_team_size=3)
    assert added_4 is False


def test_problem_selection_and_sync():
    repo = MemoryProblemRepository(seed_selections=False)
    sub_repo = MemorySubmissionRepository(seed=False)

    sub_repo.save_draft("team-1", {"project_title": "Draft 1"})
    repo.save_selection("team-1", "ps-ft-01", "u-1")

    sel = repo.get_selection("team-1")
    assert sel is not None
    assert sel["problem_statement_id"] == "ps-ft-01"


def test_evaluation_server_score_sum():
    repo = MemoryEvaluationRepository()
    score = repo.submit_score(
        "sub-1",
        "judge-1",
        {
            "innovation_score": 25,
            "technical_score": 25,
            "uiux_score": 15,
            "impact_score": 15,
            "feedback": "Great job!",
        },
    )
    assert score["total_score"] == 80
    assert score["feedback"] == "Great job!"

