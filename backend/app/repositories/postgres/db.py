"""CampusCrafters PostgreSQL Database Connection & Execution Manager."""

import json
from contextlib import contextmanager
from typing import Any, Dict, List, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, Connection


class PostgresDatabase:
    """Manages SQLAlchemy connection pool and provides execution helpers."""

    def __init__(self, database_url: str):
        # Convert postgres:// to postgresql:// if needed for SQLAlchemy 2.0+
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)

        # Fallback to psycopg (v3) if psycopg2 binary is unavailable
        try:
            import psycopg2  # noqa: F401
        except ImportError:
            try:
                import psycopg  # noqa: F401
                if database_url.startswith("postgresql://"):
                    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
            except ImportError:
                pass

        self.engine: Engine = create_engine(
            database_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=300,
        )

    @contextmanager
    def connect(self):
        """Context manager yielding a transactional connection."""
        conn = self.engine.connect()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def execute(self, query: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """Execute a parameterized SQL statement within an auto-committed connection."""
        with self.connect() as conn:
            return conn.execute(text(query), params or {})

    def fetch_one(self, query: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Fetch a single row as a dictionary."""
        with self.connect() as conn:
            result = conn.execute(text(query), params or {})
            row = result.mappings().first()
            return dict(row) if row else None

    def fetch_all(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Fetch all rows as a list of dictionaries."""
        with self.connect() as conn:
            result = conn.execute(text(query), params or {})
            return [dict(r) for r in result.mappings().all()]

