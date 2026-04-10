from __future__ import annotations

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context
from app.config import settings
from app.db.base import Base

# Import the Alembic config object.
config = context.config

# Inject the real DB URL from the application settings.
#
# Why:
# - we want one canonical DB config source
# - app runtime and Alembic should agree on the same database URL
# - we do not want to duplicate secrets or connection strings in alembic.ini
config.set_main_option("sqlalchemy.url", settings.sqlalchemy_database_url)

# Configure Python logging from alembic.ini if present.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Shared SQLAlchemy metadata for autogeneration.

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    Offline mode emits SQL without creating a live DB connection.
    We keep this standard Alembic path because it is useful later for debugging
    or SQL inspection, even though local development will mostly use online mode.
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
    Run migrations in 'online' mode.

    This creates a real SQLAlchemy engine using the same DB URL the app uses.
    That keeps Alembic aligned with the actual backend configuration.
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
