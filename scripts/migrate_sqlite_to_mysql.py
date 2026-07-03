"""Migrate application data from SQLite to MySQL."""

from __future__ import annotations

import argparse
from collections.abc import Iterable

from sqlalchemy import create_engine, func, select, text
from sqlalchemy.engine import Engine

from app.db.base import Base


def _connect_args(database_url: str) -> dict:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


def create_db_engine(database_url: str) -> Engine:
    kwargs = {}
    connect_args = _connect_args(database_url)
    if connect_args:
        kwargs["connect_args"] = connect_args
    if database_url.startswith("mysql"):
        kwargs["pool_pre_ping"] = True
        kwargs["pool_recycle"] = 3600
    return create_engine(database_url, **kwargs)


def batched(items: list[dict], size: int) -> Iterable[list[dict]]:
    for index in range(0, len(items), size):
        yield items[index : index + size]


def truncate_target_tables(target_engine: Engine) -> None:
    with target_engine.begin() as conn:
        if target_engine.dialect.name == "mysql":
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        if target_engine.dialect.name == "mysql":
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))


def table_row_count(engine: Engine, table) -> int:
    with engine.connect() as conn:
        return conn.scalar(select(func.count()).select_from(table)) or 0


def migrate(source_url: str, target_url: str, batch_size: int, truncate_target: bool) -> None:
    source_engine = create_db_engine(source_url)
    target_engine = create_db_engine(target_url)

    Base.metadata.create_all(bind=target_engine)

    if truncate_target:
        truncate_target_tables(target_engine)

    with source_engine.connect() as source_conn, target_engine.begin() as target_conn:
        for table in Base.metadata.sorted_tables:
            rows = [dict(row) for row in source_conn.execute(select(table)).mappings()]
            if not rows:
                print(f"[skip] {table.name}: 0 rows")
                continue
            for chunk in batched(rows, batch_size):
                target_conn.execute(table.insert(), chunk)
            print(f"[copy] {table.name}: {len(rows)} rows")

    print("")
    print("Migration summary:")
    for table in Base.metadata.sorted_tables:
        source_count = table_row_count(source_engine, table)
        target_count = table_row_count(target_engine, table)
        print(f"  - {table.name}: source={source_count}, target={target_count}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate SuperBizAgent data from SQLite to MySQL.")
    parser.add_argument(
        "--source-url",
        default="sqlite:///./super_biz_agent.db",
        help="Source SQLite database URL.",
    )
    parser.add_argument(
        "--target-url",
        required=True,
        help="Target MySQL database URL, for example mysql+pymysql://user:pass@127.0.0.1:3306/db?charset=utf8mb4",
    )
    parser.add_argument("--batch-size", type=int, default=500, help="Insert batch size.")
    parser.add_argument(
        "--truncate-target",
        action="store_true",
        help="Delete all target tables before inserting migrated rows.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    migrate(
        source_url=args.source_url,
        target_url=args.target_url,
        batch_size=args.batch_size,
        truncate_target=args.truncate_target,
    )
