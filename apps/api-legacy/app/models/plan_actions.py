from __future__ import annotations

import uuid

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class PlanAction(TimestampMixin, Base):
    """
    Stores one normalized action row from a generated plan.

    Why this table exists even though the full plan JSON is stored too:
    - querying individual actions becomes much easier
    - risk/approval analysis is easier later
    - execution and rollback can link to specific actions

    We also enforce that each action_index is unique within a given plan.
    That prevents duplicate "action 0" / "action 1" rows for the same plan.
    """

    __tablename__ = "plan_actions"

    # Keep one DB-level integrity rule:
    # a single plan cannot contain the same action_index twice.
    __table_args__ = (
        UniqueConstraint(
            "plan_id",
            "action_index",
            name="uq_plan_actions_plan_id_action_index",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        comment="Primary identifier for the plan action row.",
    )

    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key to the parent plan.",
    )

    action_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="The zero-based order of this action inside the plan.",
    )

    action_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Normalized action type, for example update_setting or patch_vscode_file.",
    )

    scope: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Action scope such as user, workspace, or file-based scope.",
    )

    risk_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Risk level for this action.",
    )

    requires_approval: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether this action requires explicit user approval.",
    )

    target: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Primary action target, such as a setting key or file path.",
    )

    parameters_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Structured action parameters.",
    )

    preview_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Structured preview metadata for this action.",
    )

    # Relationships
    plan = relationship(
        "Plan",
        back_populates="actions",
    )

    executions = relationship(
        "Execution",
        back_populates="action",
        cascade="all, delete-orphan",
    )

    rollback_snapshots = relationship(
        "RollbackSnapshot",
        back_populates="action",
        cascade="all, delete-orphan",
    )
