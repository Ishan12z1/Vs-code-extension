from __future__ import annotations

from app.planner.classifier import RequestClassification
from app.planner.providers.base import PlannerProvider
from app.planner.schemas import ErrorPayload, PlanError, PlanRequest, PlanResponse


class MockPlannerProvider(PlannerProvider):
    """
    Safe placeholder planner provider.

    Step 6.2 change:
    - it now receives the resolved internal request classification
    - this lets us verify classification wiring before real planning exists
    """

    name = "mock"

    def generate(
        self,
        payload: PlanRequest,
        classification: RequestClassification,
    ) -> PlanResponse:
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
                    "resolvedRequestClass": classification.requestClass,
                    "classificationSource": classification.source,
                    "classificationReason": classification.reason,
                    "classificationWarnings": classification.warnings,
                    "provider": self.name,
                },
            ),
        )
