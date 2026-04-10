from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import utc_now


class Execution(Base):
    """
    Stores one execution result for one normalized plan action.

    Why this table exists:
    - execution should be tracked per action, not only per plan
    - later rollback and history features will depend on this table
    - partial success/failure across multi-step plans becomes easier to represent
    """

    __tablename__ = "executions"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        comment="Primary identifier for the execution record.",
    )

    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key to the parent run.",
    )

    action_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plan_actions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key to the executed plan action.",
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Execution status such as pending, succeeded, failed, or skipped.",
    )

    result_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Structured execution result payload for successful or partial outcomes.",
    )

    error_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Structured execution error payload for failures.",
    )

    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=func.now(),
        comment="UTC time when the execution result was recorded.",
    )

    # Relationships
    run = relationship(
        "Run",
        back_populates="executions",
    )

    action = relationship(
        "PlanAction",
        back_populates="executions",
    )
