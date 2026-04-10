from __future__ import annotations

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

# IMPORTANT:
# Import model modules before Alembic reads Base.metadata.
# Without this, the tables may not be registered yet, and autogenerate would
# incorrectly think the schema is empty.
import app.models  # noqa: F401
from alembic import context
from app.config import settings
from app.db.base import Base

# Import the Alembic config object.
config = context.config

# Inject the real DB URL from the application settings.
config.set_main_option("sqlalchemy.url", settings.sqlalchemy_database_url)

# Configure Python logging from alembic.ini if present.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Shared SQLAlchemy metadata for autogeneration.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in offline mode.

    This produces SQL output without opening a live DB connection.
    """
    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in online mode.

    This creates a real SQLAlchemy engine using the backend settings.
    """
    configuration = config.get_section(config.config_ini_section, {})

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
