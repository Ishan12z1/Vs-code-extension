from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ProviderGenerationResult(BaseModel):
    """
    Backend-only raw provider output.

    Important:
    - this is NOT the public PlanResponse contract
    - the provider returns raw generation data here
    - Step 6.6 will validate / transform this into real public responses
    """

    model_config = ConfigDict(extra="forbid")

    rawText: str
    providerName: str
    modelName: str | None = None
    responseId: str | None = None
    finishReason: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
