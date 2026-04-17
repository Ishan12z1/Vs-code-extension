from __future__ import annotations

from app.planner.providers.base import PlannerProvider
from app.planner.schemas import ErrorPayload, PlanError, PlanRequest, PlanResponse


class MockPlannerProvider(PlannerProvider):
    """
    Safe placeholder planner provider.

    Why this exists:
    - needs a real provider boundary now
    - but real request classification / prompt orchestration / SDK wiring belongs
      to later substeps
    - so we preserve today's behavior behind the new interface
    """

    name = "mock"

    def generate(self, payload: PlanRequest) -> PlanResponse:
        """
        Return the same structured placeholder response the route used to return
        directly before Step 6.1.

        This keeps behavior stable while moving responsibility behind the provider
        boundary.
        """
        return ErrorPayload(
            kind="error",
            error=PlanError(
                code="not_implemented",
                message=(
                    f"Planning is not implemented yet for request: {payload.userRequest.text}"
                ),
                details={
                    "requestId": payload.userRequest.id,
                    "requestClassHint": payload.userRequest.requestClassHint,
                    "provider": self.name,
                },
            ),
        )
