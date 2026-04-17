from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.planner.classifier import RequestClassification
from app.planner.policy import PlannerPolicy
from app.planner.prompts import PlannerPromptPackage
from app.planner.providers.types import ProviderGenerationResult
from app.planner.schemas import PlanRequest


@runtime_checkable
class PlannerProvider(Protocol):
    """
    Backend-only planner provider boundary.

    Step 6.5 correction:
    - providers now return raw generation results
    - they do NOT return public PlanResponse objects directly
    - this keeps unvalidated model output out of the public API contract
    """

    name: str

    def generate(
        self,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
        prompt_package: PlannerPromptPackage,
    ) -> ProviderGenerationResult:
        """
        Accept validated request input plus backend-owned classification, policy,
        and prompt package, then return raw provider output.
        """
        ...
