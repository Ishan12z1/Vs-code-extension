from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import utc_now


class Approval(Base):
    """
    Stores one approval decision for a plan/run pair.

    Why this table exists:
    - approval is a first-class user decision in the product
    - we want a durable record of who approved or rejected what
    - later UI and execution flow can depend on this table
    """

    __tablename__ = "approvals"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        comment="Primary identifier for the approval record.",
    )

    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key to the parent run.",
    )

    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key to the associated plan.",
    )

    decision: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Approval decision such as approved, rejected, or cancelled.",
    )

    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=func.now(),
        comment="UTC time when the approval decision was recorded.",
    )

    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Optional user or system note explaining the approval decision.",
    )

    # Relationships
    run = relationship(
        "Run",
        back_populates="approvals",
    )

    plan = relationship(
        "Plan",
        back_populates="approvals",
    )
