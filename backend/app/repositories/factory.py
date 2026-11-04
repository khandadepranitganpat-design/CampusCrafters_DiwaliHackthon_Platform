"""Repository factory: picks the persistence adapter set from application configuration."""

from typing import Any, Dict, Mapping

from app.repositories.memory import (
    MemoryAnnouncementRepository,
    MemoryEvaluationRepository,
    MemoryEventConfigRepository,
    MemoryProblemRepository,
    MemoryRegistrationRepository,
    MemorySubmissionRepository,
    MemoryTeamRepository,
    MemoryTokenRevocationRepository,
    MemoryTrackRepository,
    MemoryUserRepository,
)


def build_memory_repositories() -> Dict[str, Any]:
    """Thread-safe in-memory adapters seeded with development data (dev/test only)."""
    return {
        "track": MemoryTrackRepository(),
        "user": MemoryUserRepository(seed=True),
        "registration": MemoryRegistrationRepository(seed=True),
        "team": MemoryTeamRepository(seed=True),
        "problem": MemoryProblemRepository(seed_selections=True),
        "submission": MemorySubmissionRepository(seed=True),
        "announcement": MemoryAnnouncementRepository(seed=True),
        "token_revocation": MemoryTokenRevocationRepository(),
        "evaluation": MemoryEvaluationRepository(),
        "event_config": MemoryEventConfigRepository(),
    }


def build_postgres_repositories(database_url: str) -> Dict[str, Any]:
    """PostgreSQL adapters sharing a single pooled SQLAlchemy engine."""
    # Imported lazily so dev/test runs never need a database driver.
    from app.repositories.postgres.db import PostgresDatabase
    from app.repositories.postgres.postgres_announcement_repository import PostgresAnnouncementRepository
    from app.repositories.postgres.postgres_evaluation_repository import PostgresEvaluationRepository
    from app.repositories.postgres.postgres_event_config_repository import PostgresEventConfigRepository
    from app.repositories.postgres.postgres_problem_repository import PostgresProblemRepository
    from app.repositories.postgres.postgres_registration_repository import PostgresRegistrationRepository
    from app.repositories.postgres.postgres_submission_repository import PostgresSubmissionRepository
    from app.repositories.postgres.postgres_team_repository import PostgresTeamRepository
    from app.repositories.postgres.postgres_token_revocation_repository import PostgresTokenRevocationRepository
    from app.repositories.postgres.postgres_track_repository import PostgresTrackRepository
    from app.repositories.postgres.postgres_user_repository import PostgresUserRepository

    db = PostgresDatabase(database_url)
    return {
        "db": db,
        "track": PostgresTrackRepository(db),
        "user": PostgresUserRepository(db),
        "registration": PostgresRegistrationRepository(db),
        "team": PostgresTeamRepository(db),
        "problem": PostgresProblemRepository(db),
        "submission": PostgresSubmissionRepository(db),
        "announcement": PostgresAnnouncementRepository(db),
        "token_revocation": PostgresTokenRevocationRepository(db),
        "evaluation": PostgresEvaluationRepository(db),
        "event_config": PostgresEventConfigRepository(db),
    }


def build_repositories(config: Mapping[str, Any]) -> Dict[str, Any]:
    """Return the adapter set for REPOSITORY_TYPE ('memory' or 'database')."""
    repo_type = config.get("REPOSITORY_TYPE", "memory")
    if repo_type == "database":
        url = config.get("DATABASE_URL")
        if not url:
            raise RuntimeError("REPOSITORY_TYPE='database' requires DATABASE_URL to be set.")
        return build_postgres_repositories(url)
    if repo_type == "memory":
        return build_memory_repositories()
    raise RuntimeError(f"Unknown REPOSITORY_TYPE '{repo_type}'. Expected 'memory' or 'database'.")
