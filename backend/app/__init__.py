"""CampusCrafters Hackathon Platform — Flask Application Factory."""

import os
from typing import Optional
from flask import Flask, g
from dotenv import load_dotenv

from app.config import config_by_name
from app.extensions import cors
from app.errors.handlers import register_error_handlers
from app.utils.logging import setup_logging
from app.api import register_blueprints

from app.repositories.factory import build_repositories

# Services
from app.services import (
    AuthService,
    RegistrationService,
    UserService,
    TeamService,
    ProblemService,
    SubmissionService,
    AnnouncementService,
    EvaluationService,
    EventConfigService,
)

load_dotenv()


def create_app(config_name: Optional[str] = None) -> Flask:
    """Application factory for the CampusCrafters backend."""
    if not config_name:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    if config_name not in config_by_name:
        raise RuntimeError(
            f"Unknown configuration '{config_name}'. Expected one of: {', '.join(config_by_name)}."
        )
    config_class = config_by_name[config_name]
    app.config.from_object(config_class)

    # --------------------------------------------------------------------------
    # Production Persistence Guard
    # --------------------------------------------------------------------------
    if config_name == "production" or app.config.get("ENV") == "production":
        db_url = app.config.get("DATABASE_URL")
        repo_type = app.config.get("REPOSITORY_TYPE")
        if not db_url or repo_type == "memory":
            raise RuntimeError(
                "CRITICAL SECURITY GUARD: In-memory persistence is strictly forbidden in production. "
                "DATABASE_URL must be configured with a PostgreSQL/Supabase connection string."
            )

        from app.config import INSECURE_DEFAULT_SECRETS

        for key in ("SECRET_KEY", "JWT_SECRET_KEY"):
            value = app.config.get(key)
            if not value or value in INSECURE_DEFAULT_SECRETS or len(value) < 32:
                raise RuntimeError(
                    f"CRITICAL SECURITY GUARD: {key} must be set to a unique random value "
                    "of at least 32 characters in production."
                )

    # --------------------------------------------------------------------------
    # Structured Logging
    # --------------------------------------------------------------------------
    setup_logging(app)

    # --------------------------------------------------------------------------
    # CORS Extension Setup
    # --------------------------------------------------------------------------
    allowed_origins = app.config.get("CORS_ALLOWED_ORIGINS", ["*"])
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # --------------------------------------------------------------------------
    # Repository & Service Instances (Dependency Injection)
    # --------------------------------------------------------------------------
    repos = build_repositories(app.config)
    track_repo = repos["track"]
    user_repo = repos["user"]
    reg_repo = repos["registration"]
    team_repo = repos["team"]
    problem_repo = repos["problem"]
    submission_repo = repos["submission"]
    announcement_repo = repos["announcement"]
    token_repo = repos["token_revocation"]
    eval_repo = repos["evaluation"]
    config_repo = repos["event_config"]

    auth_service = AuthService(user_repo, token_repo, reg_repo, team_repo)
    reg_service = RegistrationService(reg_repo, user_repo, config_repo, track_repo)
    user_service = UserService(user_repo, reg_repo, track_repo)
    team_service = TeamService(team_repo, user_repo, track_repo)
    problem_service = ProblemService(problem_repo, submission_repo, track_repo)
    submission_service = SubmissionService(submission_repo, problem_repo, team_repo, config_repo)
    announcement_service = AnnouncementService(announcement_repo)
    eval_service = EvaluationService(eval_repo, submission_repo, team_repo, config_repo)
    event_config_service = EventConfigService(config_repo, problem_repo)

    # Store singletons on app container
    app.db = repos.get("db")
    app.repositories = {
        "track": track_repo,
        "user": user_repo,
        "registration": reg_repo,
        "team": team_repo,
        "problem": problem_repo,
        "submission": submission_repo,
        "announcement": announcement_repo,
        "token_revocation": token_repo,
        "evaluation": eval_repo,
        "event_config": config_repo,
    }

    app.services = {
        "auth": auth_service,
        "registration": reg_service,
        "user": user_service,
        "team": team_service,
        "problem": problem_service,
        "submission": submission_service,
        "announcement": announcement_service,
        "evaluation": eval_service,
        "event_config": event_config_service,
    }

    @app.before_request
    def attach_dependencies_to_request_context():
        """Attach thread-safe repository and service references to Flask request context (g)."""
        g.repos = app.repositories
        g.token_revocation_repo = token_repo
        g.team_repo = team_repo
        g.registration_repo = reg_repo

        g.auth_service = auth_service
        g.registration_service = reg_service
        g.user_service = user_service
        g.team_service = team_service
        g.problem_service = problem_service
        g.submission_service = submission_service
        g.announcement_service = announcement_service
        g.evaluation_service = eval_service
        g.event_config_service = event_config_service

    # --------------------------------------------------------------------------
    # Centralized Error Handlers
    # --------------------------------------------------------------------------
    register_error_handlers(app)

    # --------------------------------------------------------------------------
    # Blueprint Registration
    # --------------------------------------------------------------------------
    register_blueprints(app)

    app.logger.info("CampusCrafters application initialized successfully under '%s' profile.", config_name)
    return app

