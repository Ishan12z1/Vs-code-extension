from __future__ import annotations

import uuid

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Run(TimestampMixin, Base):
    """
    Stores one user request lifecycle.

    This is the top-level record for a backend request/run.
    Later tables like plans, approvals, executions, and rollback snapshots
    attach to this row.
    """

    __tablename__ = "runs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        comment="Primary identifier for the run.",
    )

    user_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Optional user identifier for future authenticated modes.",
    )

    request_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="The raw user request text submitted to the system.",
    )

    request_class: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="Request class such as explain, inspect, configure, repair, or guide.",
    )

    workspace_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Optional workspace identifier if the backend later tracks stable workspaces.",
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="received",
        comment="Current lifecycle status for the run.",
    )

    trace_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Optional trace identifier for observability/debugging.",
    )

    metadata_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Optional structured request metadata captured alongside the run.",
    )

    # Relationships
    plans = relationship(
        "Plan",
        back_populates="run",
        cascade="all, delete-orphan",
    )

    approvals = relationship(
        "Approval",
        back_populates="run",
        cascade="all, delete-orphan",
    )

    executions = relationship(
        "Execution",
        back_populates="run",
        cascade="all, delete-orphan",
    )

    rollback_snapshots = relationship(
        "RollbackSnapshot",
        back_populates="run",
        cascade="all, delete-orphan",
    )
