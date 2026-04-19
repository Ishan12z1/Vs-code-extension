from __future__ import annotations

from dataclasses import dataclass, field

from app.planner.schemas import PlanResponse
from app.planner.schemas.contracts import RequestClass


@dataclass(slots=True)
class PlannerRunRecord:
    """
    Backend-only planner execution record.

    Why this exists:
    - PlannerService now knows more than just the final public response
    - persistence needs provider / classification / prompt metadata too
    - we do not want the route to reconstruct that state from scratch
    """

    response: PlanResponse

    # Classification metadata
    resolved_request_class: RequestClass
    classification_source: str
    classification_reason: str
    classification_warnings: list[str] = field(default_factory=list)

    # Prompt / provider metadata
    prompt_mode: str = ""
    supports_planning: bool = False
    provider_name: str | None = None
    provider_model: str | None = None
    provider_response_id: str | None = None
    provider_finish_reason: str | None = None
    raw_text_preview: str | None = None

    # Retry / lifecycle metadata
    retry_attempted: bool = False
    run_status: str = "completed"
