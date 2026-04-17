from __future__ import annotations

from app.planner.classifier import RequestClassification
from app.planner.policy import PlannerPolicy
from app.planner.providers.base import PlannerProvider
from app.planner.schemas import ErrorPayload, PlanError, PlanRequest, PlanResponse


class MockPlannerProvider(PlannerProvider):
    """
    Safe placeholder planner provider.

    Step 6.3 change:
    - it now receives the backend-owned planner policy bundle
    - this lets us verify bounded action/risk policy wiring before real model
      planning exists
    """

    name = "mock"

    def generate(
        self,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
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
                    "supportsPlanning": policy.supportsPlanning,
                    "allowedActionTypes": [action.actionType for action in policy.allowedActions],
                    "policyRules": policy.policyRules,
                    "provider": self.name,
                },
            ),
        )
