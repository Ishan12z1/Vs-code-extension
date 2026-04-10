from __future__ import annotations

import uuid

from sqlalchemy import JSON, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class EvalRun(TimestampMixin, Base):
    """
    Stores one evaluation suite execution result.

    Why this table exists:
    - planner behavior needs measurable regression checks later
    - we want durable records of evaluation runs
    - storing the full structured result payload keeps this flexible while the
      evaluation framework is still evolving
    """

    __tablename__ = "eval_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        comment="Primary identifier for the evaluation run.",
    )

    suite_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Name of the evaluation suite that was executed.",
    )

    planner_version: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="Planner/provider version evaluated during this run.",
    )

    results_json: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        comment="Structured evaluation results payload.",
    )

    score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="Optional aggregate score for the evaluation run.",
    )
