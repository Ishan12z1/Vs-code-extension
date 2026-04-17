from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.planner.schemas import PlanRequest, PlanResponse


@runtime_checkable
class PlannerProvider(Protocol):
    """
    Backend-only planner provider boundary.
    - it sits behind the already-existing PlanRequest / PlanResponse contracts
    - route handlers and services depend on this boundary, not on SDK types
    """

    name: str

    def generate(self, payload: PlanRequest) -> PlanResponse:
        """
        Accept the validated planner request and return a validated planner response.
        """
        ...
