from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


def utc_now() -> datetime:
    """
    Returns the current UTC timestamp.

    Why we keep this helper:
    - Python-side defaults stay explicit
    - tests can reason about a single timestamp strategy
    - all models use the same UTC convention
    """
    return datetime.now(timezone.utc)


class TimestampMixin:
    """
    Shared created/updated timestamp columns.

    We use this mixin so all core persistence tables get the same basic
    audit fields without repeating column definitions in every model.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=func.now(),
        comment="UTC time when this row was created.",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        server_default=func.now(),
        comment="UTC time when this row was last updated.",
    )
