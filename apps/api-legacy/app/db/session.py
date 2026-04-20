from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

# Create one shared SQLAlchemy engine for the app.
#
# Why these options:
# - pool_pre_ping: avoids stale pooled connections during local dev/restarts
# - echo: useful later if you want SQL logs, but off by default
# - connect_timeout: keeps local failures fast and obvious
engine: Engine = create_engine(
    settings.sqlalchemy_database_url,
    echo=settings.database_echo,
    pool_pre_ping=settings.database_pool_pre_ping,
    connect_args={
        "connect_timeout": settings.database_connect_timeout_seconds,
    },
)

# Create one shared session factory.
#
# Important defaults:
# - autoflush=False: keep DB writes more explicit
# - autocommit=False: standard SQLAlchemy unit-of-work behavior
# - expire_on_commit=False: easier behavior for API/service code
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db_session() -> Generator[Session, None, None]:
    """
    FastAPI-friendly DB session dependency.

    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_database_engine_connection() -> dict[str, str | None]:
    """
    Tiny SQLAlchemy-based DB connectivity check.
    """
    with engine.connect() as connection:
        database_name = connection.execute(
            text("SELECT current_database() AS database_name;")
        ).scalar_one()

    return {
        "status": "ok",
        "database_name": database_name,
    }
