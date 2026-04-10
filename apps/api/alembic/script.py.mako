"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

${imports if imports else ""}

# Revision identifiers, used by Alembic.
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    """
    Apply this migration.

    C4 uses this template so later revisions in C5+ have a clean, typed starting point.
    """
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    """
    Revert this migration.

    Every migration should keep downgrade logic explicit, even early in the project.
    """
    ${downgrades if downgrades else "pass"}