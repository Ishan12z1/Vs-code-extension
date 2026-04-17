from __future__ import annotations

from app.planner.providers.base import PlannerProvider
from app.planner.schemas import PlanRequest, PlanResponse


class PlannerService:
    """
    Thin backend orchestration layer for planner calls.

    The route should call this service.
    The service should call a provider.
    The provider will eventually hide SDK-specific logic.

    This layer is intentionally thin
    Later substeps will add:
    - request classification
    - validation/repair
    - persistence
    - tracing
    """

    def __init__(self, provider: PlannerProvider) -> None:
        self._provider = provider

    def generate(self, payload: PlanRequest) -> PlanResponse:
        """
        Delegate planner generation to the configured provider.
        """
        return self._provider.generate(payload)
