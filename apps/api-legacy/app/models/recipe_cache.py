from __future__ import annotations

import uuid

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class RecipeCache(TimestampMixin, Base):
    """
    Stores cached recipe or template payloads.

    Why this table exists:
    - recipe lookup/template generation may become expensive or repetitive later
    - storing the payload as JSON keeps the cache flexible while the recipe
      system is still being defined
    - the source field makes it easier to distinguish where the cached payload
      came from, such as local templates, MCP, or another provider
    """

    __tablename__ = "recipe_cache"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        comment="Primary identifier for the cached recipe row.",
    )

    recipe_key: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="Stable cache key for the recipe/template payload.",
    )

    source: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Source of the cached recipe payload, such as mcp or local_template.",
    )

    payload_json: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        comment="Structured cached recipe/template payload.",
    )
