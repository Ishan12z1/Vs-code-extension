from __future__ import annotations

from app.planner.classifier import RequestClassifier
from app.planner.policy import PlannerPolicyBuilder
from app.planner.prompts import PlannerPromptBuilder
from app.planner.providers.base import PlannerProvider
from app.planner.schemas import ErrorPayload, PlanError, PlanRequest, PlanResponse


class PlannerService:
    """
    Thin backend orchestration layer for planner calls.

    Step 6.2 added:
    - request classification before provider execution
    - early unsupported-request rejection

    Step 6.3 added:
    - backend-owned allowed-action and risk-policy construction

    Step 6.4 adds:
    - backend-owned prompt contract construction

    Still intentionally missing:
    - model orchestration
    - actual SDK adapter
    - plan validation/repair
    - persistence
    """

    def __init__(
        self,
        provider: PlannerProvider,
        classifier: RequestClassifier | None = None,
        policy_builder: PlannerPolicyBuilder | None = None,
        prompt_builder: PlannerPromptBuilder | None = None,
    ) -> None:
        self._provider = provider
        self._classifier = classifier or RequestClassifier()
        self._policy_builder = policy_builder or PlannerPolicyBuilder()
        self._prompt_builder = prompt_builder or PlannerPromptBuilder()

    def generate(self, payload: PlanRequest) -> PlanResponse:
        """
        Resolve request class first, reject obviously unsupported asks early,
        build bounded policy input, build normalized prompt input, then delegate
        to the configured provider.
        """
        classification = self._classifier.classify(payload)

        if not classification.isSupported:
            return ErrorPayload(
                kind="error",
                error=PlanError(
                    code="unsupported_request",
                    message=classification.unsupportedReason or "This request is not supported.",
                    details={
                        "requestId": payload.userRequest.id,
                        "requestClassHint": payload.userRequest.requestClassHint,
                        "resolvedRequestClass": classification.requestClass,
                        "classificationSource": classification.source,
                        "classificationReason": classification.reason,
                        "classificationWarnings": classification.warnings,
                    },
                ),
            )

        policy = self._policy_builder.build(classification.requestClass)
        prompt_package = self._prompt_builder.build(
            payload=payload,
            classification=classification,
            policy=policy,
        )

        return self._provider.generate(
            payload=payload,
            classification=classification,
            policy=policy,
            prompt_package=prompt_package,
        )
