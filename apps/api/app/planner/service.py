from __future__ import annotations

from app.planner.classifier import RequestClassifier
from app.planner.policy import PlannerPolicyBuilder
from app.planner.prompts import PlannerPromptBuilder
from app.planner.providers.base import PlannerProvider
from app.planner.schemas import ErrorPayload, PlanError, PlanRequest, PlanResponse
from app.planner.validation import PlannerResponseValidator


class PlannerService:
    """
    Thin backend orchestration layer for planner calls.

    Step 6.2 added classification.
    Step 6.3 added bounded policy.
    Step 6.4 added prompt contracts.
    Step 6.5 added provider adapter invocation.
    Step 6.6 adds structured output validation.

    Still intentionally missing:
    - repair / retry (Step 6.7)
    - persistence (Step 6.8)
    """

    def __init__(
        self,
        provider: PlannerProvider,
        classifier: RequestClassifier | None = None,
        policy_builder: PlannerPolicyBuilder | None = None,
        prompt_builder: PlannerPromptBuilder | None = None,
        response_validator: PlannerResponseValidator | None = None,
    ) -> None:
        self._provider = provider
        self._classifier = classifier or RequestClassifier()
        self._policy_builder = policy_builder or PlannerPolicyBuilder()
        self._prompt_builder = prompt_builder or PlannerPromptBuilder()
        self._response_validator = response_validator or PlannerResponseValidator()

    def generate(self, payload: PlanRequest) -> PlanResponse:
        """
        Resolve request class, reject unsupported asks early, build policy,
        build prompt package, invoke the provider, then validate raw provider
        output against the shared public response contract.
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

        try:
            provider_result = self._provider.generate(
                payload=payload,
                classification=classification,
                policy=policy,
                prompt_package=prompt_package,
            )
        except Exception as exc:
            return ErrorPayload(
                kind="error",
                error=PlanError(
                    code="internal_error",
                    message="Planner provider invocation failed.",
                    details={
                        "requestId": payload.userRequest.id,
                        "provider": getattr(self._provider, "name", "unknown"),
                        "errorType": type(exc).__name__,
                        "errorMessage": str(exc),
                    },
                ),
            )

        return self._response_validator.validate(
            provider_result=provider_result,
            prompt_package=prompt_package,
        )
