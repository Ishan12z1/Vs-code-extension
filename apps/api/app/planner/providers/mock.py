from __future__ import annotations

from app.planner.classifier import RequestClassification
from app.planner.policy import PlannerPolicy
from app.planner.prompts import PlannerPromptPackage
from app.planner.providers.base import PlannerProvider
from app.planner.schemas import ErrorPayload, PlanError, PlanRequest, PlanResponse


class MockPlannerProvider(PlannerProvider):
    """
    Safe placeholder planner provider.

    Step 6.4 change:
    - it now receives the normalized prompt package
    - this lets us verify prompt-path wiring before real SDK integration exists
    """

    name = "mock"

    def generate(
        self,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
        prompt_package: PlannerPromptPackage,
    ) -> PlanResponse:
        return ErrorPayload(
            kind="error",
            error=PlanError(
                code="not_implemented",
                message=(f"Planning is not implemented yet for request: {payload.userRequest.text}"),
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
                    "promptMode": prompt_package.mode,
                    "promptMessageCount": len(prompt_package.messages),
                    "promptSystemPreview": (
                        prompt_package.messages[0].content[:200] if prompt_package.messages else ""
                    ),
                    "provider": self.name,
                },
            ),
        )
