"""bootstrap alembic infrastructure

Revision ID: 20260410_000001
Revises: None
Create Date: 2026-04-10 00:00:01
"""

from __future__ import annotations

# Revision identifiers, used by Alembic.
revision = "20260410_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Bootstrap migration chain.
    """
    pass


def downgrade() -> None:
    """
    Revert the bootstrap revision.

    This is also a no-op because the bootstrap revision does not change schema state.
    """
    pass
