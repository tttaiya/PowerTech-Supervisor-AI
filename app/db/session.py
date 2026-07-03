"""SQLAlchemy session and database initialization helpers."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import config


def _connect_args(database_url: str) -> dict:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


def _engine_kwargs(database_url: str) -> dict:
    kwargs = {}
    connect_args = _connect_args(database_url)
    if connect_args:
        kwargs["connect_args"] = connect_args
    if database_url.startswith("mysql"):
        kwargs["pool_pre_ping"] = config.database_pool_pre_ping
        kwargs["pool_recycle"] = config.database_pool_recycle
    return kwargs


engine = create_engine(config.database_url, **_engine_kwargs(config.database_url))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(bind: Engine | None = None) -> None:
    from app.db.base import Base

    Base.metadata.create_all(bind=bind or engine)
