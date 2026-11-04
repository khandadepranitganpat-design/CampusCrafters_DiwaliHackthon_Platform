"""CampusCrafters API Blueprint Registration."""

from flask import Flask
from app.api.auth.routes import auth_bp
from app.api.registrations.routes import registrations_bp
from app.api.participants.routes import participants_bp
from app.api.teams.routes import teams_bp
from app.api.problems.routes import problems_bp
from app.api.submissions.routes import submissions_bp
from app.api.announcements.routes import announcements_bp
from app.api.evaluations.routes import evaluations_bp
from app.api.admin.routes import admin_bp
from app.api.dashboard.routes import dashboard_bp


def register_blueprints(app: Flask) -> None:
    """Register all API blueprints under /api/v1 prefix."""
    api_prefix = "/api/v1"

    app.register_blueprint(dashboard_bp, url_prefix=api_prefix)
    app.register_blueprint(auth_bp, url_prefix=f"{api_prefix}/auth")
    app.register_blueprint(registrations_bp, url_prefix=f"{api_prefix}/registrations")
    app.register_blueprint(participants_bp, url_prefix=f"{api_prefix}/profile")
    app.register_blueprint(teams_bp, url_prefix=f"{api_prefix}/teams")
    app.register_blueprint(problems_bp, url_prefix=api_prefix)
    app.register_blueprint(submissions_bp, url_prefix=api_prefix)
    app.register_blueprint(announcements_bp, url_prefix=f"{api_prefix}/announcements")
    app.register_blueprint(evaluations_bp, url_prefix=f"{api_prefix}/evaluator")
    app.register_blueprint(admin_bp, url_prefix=f"{api_prefix}/admin")

