from __future__ import annotations

import uuid

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Plan(TimestampMixin, Base):
    """
    Stores one generated plan for a run.

    We keep the full structured plan JSON here, while related plan action rows
    provide a normalized view of individual actions.
    """

    __tablename__ = "plans"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        comment="Primary identifier for the plan.",
    )

    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key to the parent run.",
    )

    plan_json: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        comment="Full structured plan payload returned by the planner.",
    )

    risk_summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Human-readable or summarized risk description for the plan.",
    )

    planner_version: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="Planner/provider version used when generating this plan.",
    )

    action_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Cached number of normalized plan actions linked to this plan.",
    )

    # Relationships
    run = relationship(
        "Run",
        back_populates="plans",
    )

    actions = relationship(
        "PlanAction",
        back_populates="plan",
        cascade="all, delete-orphan",
    )

    approvals = relationship(
        "Approval",
        back_populates="plan",
        cascade="all, delete-orphan",
    )
