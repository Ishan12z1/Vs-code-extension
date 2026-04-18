from __future__ import annotations

from app.planner.classifier import RequestClassifier
from app.planner.policy import PlannerPolicyBuilder
from app.planner.prompts import PlannerPromptBuilder
from app.planner.providers.base import PlannerProvider
from app.planner.schemas import ErrorPayload, PlanError, PlanRequest, PlanResponse
from app.planner.validation import PlannerResponseValidator


class PlannerService:
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

        first_result = self._response_validator.validate(
            provider_result=provider_result,
            prompt_package=prompt_package,
            policy=policy,
            workspace_snapshot=payload.workspaceSnapshot,
        )

        if first_result.kind != "error" or first_result.error.code != "invalid_plan_payload":
            return first_result

        retry_prompt = self._prompt_builder.build_retry_for_invalid_output(
            payload=payload,
            classification=classification,
            policy=policy,
            previous_prompt=prompt_package,
            previous_provider_result=provider_result,
            validation_reason=first_result.error.details.get("reason", "Invalid planner payload.")
            if first_result.error.details
            else "Invalid planner payload.",
        )

        try:
            retry_provider_result = self._provider.generate(
                payload=payload,
                classification=classification,
                policy=policy,
                prompt_package=retry_prompt,
            )
        except Exception as exc:
            if first_result.error.details is not None:
                first_result.error.details["retryAttempted"] = True
                first_result.error.details["retryFailed"] = True
                first_result.error.details["retryErrorType"] = type(exc).__name__
                first_result.error.details["retryErrorMessage"] = str(exc)
            return first_result

        retry_result = self._response_validator.validate(
            provider_result=retry_provider_result,
            prompt_package=retry_prompt,
            policy=policy,
            workspace_snapshot=payload.workspaceSnapshot,
        )

        if retry_result.kind == "error" and retry_result.error.details is not None:
            retry_result.error.details["retryAttempted"] = True
            retry_result.error.details["initialProviderRawTextPreview"] = provider_result.rawText[:1000]

        return retry_result
