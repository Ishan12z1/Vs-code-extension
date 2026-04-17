from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.planner.classifier import RequestClassification
from app.planner.policy import PlannerPolicy
from app.planner.schemas import PlanRequest, PlanResponse


@runtime_checkable
class PlannerProvider(Protocol):
    """
    Backend-only planner provider boundary.

    Important:
    - this is NOT a new shared contract layer
    - it sits behind the already-existing PlanRequest / PlanResponse contracts
    - route handlers and services depend on this boundary, not on SDK types
    """

    name: str

    def generate(
        self,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
    ) -> PlanResponse:
        """
        Accept the validated planner request plus backend-owned classification and
        policy inputs, then return a validated planner response.
        """
        ...
