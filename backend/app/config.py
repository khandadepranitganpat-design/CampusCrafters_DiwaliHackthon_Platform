"""CampusCrafters Flask Backend — Environment-based Configuration."""

import os
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()


class BaseConfig:
    """Base configuration common to all environments."""

    ENV: str = os.getenv("FLASK_ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-campus-sprint-2026")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key-campus-sprint-2026")
    JWT_EXPIRATION_SECONDS: int = int(os.getenv("JWT_EXPIRATION_SECONDS", "86400"))

    # Configurable Team Capacity
    MIN_TEAM_SIZE: int = int(os.getenv("MIN_TEAM_SIZE", "2"))
    MAX_TEAM_SIZE: int = int(os.getenv("MAX_TEAM_SIZE", "5"))

    # Submission Deadline (UTC ISO 8601 string or None)
    SUBMISSION_DEADLINE_UTC: Optional[str] = os.getenv("SUBMISSION_DEADLINE_UTC") or None

    # CORS origins
    cors_env = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500")
    CORS_ALLOWED_ORIGINS: List[str] = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

    # Database
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL") or None
    REPOSITORY_TYPE: str = "memory"

    # Campus Crafter SSO Configuration (pending project lead)
    SSO_CLIENT_ID: Optional[str] = os.getenv("SSO_CLIENT_ID") or None
    SSO_CLIENT_SECRET: Optional[str] = os.getenv("SSO_CLIENT_SECRET") or None
    SSO_DISCOVERY_URL: Optional[str] = os.getenv("SSO_DISCOVERY_URL") or None
    SSO_REDIRECT_URI: str = os.getenv("SSO_REDIRECT_URI", "https://campuscrafters.com/auth/callback")
    SSO_COOKIE_SAMESITE: str = os.getenv("SSO_COOKIE_SAMESITE", "Lax")
    SSO_COOKIE_SECURE: bool = False
    SSO_STATE_TTL_SECONDS: int = 600

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    DEBUG: bool = False
    TESTING: bool = False


class DevelopmentConfig(BaseConfig):
    """Configuration for local development."""

    ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"
    REPOSITORY_TYPE: str = "memory"


class TestingConfig(BaseConfig):
    """Configuration for automated test execution."""

    ENV: str = "testing"
    TESTING: bool = True
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"
    REPOSITORY_TYPE: str = "memory"
    SECRET_KEY: str = "test-secret-key-not-for-production"
    JWT_SECRET_KEY: str = "test-jwt-secret-not-for-production"
    JWT_EXPIRATION_SECONDS: int = 3600


class ProductionConfig(BaseConfig):
    """Configuration for production deployment."""

    # Pinned here (not read from FLASK_ENV) so that create_app("production") can never
    # silently leave the dev-only /auth/dev/* routes enabled.
    ENV: str = "production"
    SSO_COOKIE_SAMESITE: str = os.getenv("SSO_COOKIE_SAMESITE", "None")
    SSO_COOKIE_SECURE: bool = True
    DEBUG: bool = False
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    REPOSITORY_TYPE: str = "database"


INSECURE_DEFAULT_SECRETS = {
    "dev-secret-key-campus-sprint-2026",
    "dev-jwt-secret-key-campus-sprint-2026",
    "change-me-in-production-campus-crafter-secret-key-2026",
    "change-me-in-production-campus-crafter-jwt-secret-2026",
}

config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}

