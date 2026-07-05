"""SQLAlchemy session and database initialization helpers."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.sql import text
from sqlalchemy.orm import Session, sessionmaker

from app.config import config


def _connect_args(database_url: str) -> dict:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


engine = create_engine(config.database_url, connect_args=_connect_args(config.database_url))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(bind: Engine | None = None) -> None:
    from app.db.base import Base

    active_engine = bind or engine
    Base.metadata.create_all(bind=active_engine)
    _ensure_sqlite_auth_schema(active_engine)


def _ensure_sqlite_auth_schema(active_engine: Engine) -> None:
    """Make old demo SQLite volumes compatible with the current auth models."""
    if not active_engine.url.drivername.startswith("sqlite"):
        return

    auth_columns: dict[str, dict[str, str]] = {
        "users": {
            "display_name": "VARCHAR(120) NOT NULL DEFAULT ''",
            "status": "VARCHAR(20) NOT NULL DEFAULT 'active'",
            "last_login_at": "DATETIME",
            "created_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
            "updated_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
        },
        "refresh_tokens": {
            "revoked_at": "DATETIME",
            "created_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
            "updated_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
        },
    }

    with active_engine.begin() as conn:
        for table_name, required_columns in auth_columns.items():
            table_exists = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name=:table_name"),
                {"table_name": table_name},
            ).first()
            if not table_exists:
                continue
            existing = {
                row[1]
                for row in conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
            }
            for column_name, ddl in required_columns.items():
                if column_name in existing:
                    continue
                try:
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}"))
                except SQLAlchemyError:
                    # create_all already covers fresh databases; this path only helps older demo volumes.
                    raise
        conn.execute(
            text("UPDATE users SET display_name = username WHERE display_name IS NULL OR display_name = ''")
        )
        conn.execute(text("UPDATE users SET status = 'active' WHERE status IS NULL OR status = ''"))
