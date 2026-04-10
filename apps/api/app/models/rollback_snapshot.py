from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import utc_now


class RollbackSnapshot(Base):
    """
    Stores rollback metadata for one executed action.

    Why this table exists:
    - undo is a product guarantee for supported actions
    - we need durable pre-change state or rollback instructions
    - storing rollback metadata per action keeps reversal bounded and explicit
    """

    __tablename__ = "rollback_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        comment="Primary identifier for the rollback snapshot record.",
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
        comment="Foreign key to the plan action this rollback snapshot belongs to.",
    )

    snapshot_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Rollback snapshot type, such as file_backup or setting_previous_value.",
    )

    snapshot_json: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        comment="Structured rollback payload used to revert the action later.",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=func.now(),
        comment="UTC time when the rollback snapshot was recorded.",
    )

    # Relationships
    run = relationship(
        "Run",
        back_populates="rollback_snapshots",
    )

    action = relationship(
        "PlanAction",
        back_populates="rollback_snapshots",
    )
