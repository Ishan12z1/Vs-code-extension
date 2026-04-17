from __future__ import annotations

import json

from app.planner.classifier import RequestClassification
from app.planner.policy import PlannerPolicy
from app.planner.prompts import PlannerPromptPackage
from app.planner.providers.base import PlannerProvider
from app.planner.providers.types import ProviderGenerationResult
from app.planner.schemas import PlanRequest


class MockPlannerProvider(PlannerProvider):
    """
    Safe placeholder planner provider.

    In 6.6, the mock provider returns raw JSON text that already conforms to the
    shared public PlanResponse contract, so the validator can accept it.
    """

    name = "mock"

    def generate(
        self,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
        prompt_package: PlannerPromptPackage,
    ) -> ProviderGenerationResult:
        raw_payload = {
            "kind": "error",
            "error": {
                "code": "not_implemented",
                "message": (
                    "Mock provider placeholder. Real model generation is not "
                    "implemented in the mock provider."
                ),
                "details": {
                    "requestId": payload.userRequest.id,
                    "resolvedRequestClass": classification.requestClass,
                    "promptMode": prompt_package.mode,
                    "supportsPlanning": policy.supportsPlanning,
                    "provider": self.name,
                },
            },
        }

        return ProviderGenerationResult(
            rawText=json.dumps(raw_payload, indent=2, sort_keys=True),
            providerName=self.name,
            modelName="none",
            metadata={
                "promptMode": prompt_package.mode,
                "supportsPlanning": policy.supportsPlanning,
            },
        )
