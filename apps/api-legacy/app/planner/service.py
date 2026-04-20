from __future__ import annotations

from app.planner.classifier import RequestClassifier
from app.planner.policy import PlannerPolicyBuilder
from app.planner.prompts import PlannerPromptBuilder
from app.planner.providers.base import PlannerProvider
from app.planner.result import PlannerRunRecord
from app.planner.schemas import ErrorPayload, PlanError, PlanRequest, PlanResponse
from app.planner.validation import PlannerResponseValidator


class PlannerService:
    """
    Planner orchestration layer.

    Step 6.8 change:
    - generate_record(...) returns both the public response and the internal
      metadata needed for DB persistence.
    - generate(...) is kept as a convenience wrapper for callers/tests that only
      need the final public response.
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
        Convenience wrapper that preserves the older call shape.
        """
        return self.generate_record(payload).response

    def generate_record(self, payload: PlanRequest) -> PlannerRunRecord:
        """
        Full planner execution path returning both:
        - the public planner response
        - internal metadata needed for persistence
        """
        classification = self._classifier.classify(payload)

        if not classification.isSupported:
            response = ErrorPayload(
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
            return PlannerRunRecord(
                response=response,
                resolved_request_class=classification.requestClass,
                classification_source=classification.source,
                classification_reason=classification.reason,
                classification_warnings=classification.warnings,
                prompt_mode="unsupported",
                supports_planning=False,
                run_status="unsupported_request",
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
            response = ErrorPayload(
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
            return PlannerRunRecord(
                response=response,
                resolved_request_class=classification.requestClass,
                classification_source=classification.source,
                classification_reason=classification.reason,
                classification_warnings=classification.warnings,
                prompt_mode=prompt_package.mode,
                supports_planning=policy.supportsPlanning,
                provider_name=getattr(self._provider, "name", "unknown"),
                run_status="provider_error",
            )

        first_result = self._response_validator.validate(
            provider_result=provider_result,
            prompt_package=prompt_package,
            policy=policy,
            workspace_snapshot=payload.workspaceSnapshot,
        )

        retry_attempted = False
        final_response = first_result
        final_provider_result = provider_result
        final_prompt_mode = prompt_package.mode

        if first_result.kind == "error" and first_result.error.code == "invalid_plan_payload":
            retry_attempted = True

            retry_prompt = self._prompt_builder.build_retry_for_invalid_output(
                payload=payload,
                classification=classification,
                policy=policy,
                previous_prompt=prompt_package,
                previous_provider_result=provider_result,
                validation_reason=first_result.error.details.get(
                    "reason",
                    "Invalid planner payload.",
                )
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

                retry_result = self._response_validator.validate(
                    provider_result=retry_provider_result,
                    prompt_package=retry_prompt,
                    policy=policy,
                    workspace_snapshot=payload.workspaceSnapshot,
                )

                final_response = retry_result
                final_provider_result = retry_provider_result
                final_prompt_mode = retry_prompt.mode

                if retry_result.kind == "error" and retry_result.error.details is not None:
                    retry_result.error.details["retryAttempted"] = True
                    retry_result.error.details["initialProviderRawTextPreview"] = provider_result.rawText[:1000]

            except Exception as exc:
                if first_result.kind == "error" and first_result.error.details is not None:
                    first_result.error.details["retryAttempted"] = True
                    first_result.error.details["retryFailed"] = True
                    first_result.error.details["retryErrorType"] = type(exc).__name__
                    first_result.error.details["retryErrorMessage"] = str(exc)

                final_response = first_result
                final_provider_result = provider_result
                final_prompt_mode = retry_prompt.mode

        return PlannerRunRecord(
            response=final_response,
            resolved_request_class=classification.requestClass,
            classification_source=classification.source,
            classification_reason=classification.reason,
            classification_warnings=classification.warnings,
            prompt_mode=final_prompt_mode,
            supports_planning=policy.supportsPlanning,
            provider_name=final_provider_result.providerName,
            provider_model=final_provider_result.modelName,
            provider_response_id=final_provider_result.responseId,
            provider_finish_reason=final_provider_result.finishReason,
            raw_text_preview=final_provider_result.rawText[:1000],
            retry_attempted=retry_attempted,
            run_status=self._run_status_for_response(final_response),
        )

    def _run_status_for_response(self, response: PlanResponse) -> str:
        """
        Map the public planner response into one durable run lifecycle status.
        """
        if response.kind == "plan":
            return "completed_plan"

        if response.kind == "explanation":
            return "completed_explanation"

        if response.error.code == "invalid_plan_payload":
            return "invalid_plan_payload"

        if response.error.code == "unsupported_request":
            return "unsupported_request"

        if response.error.code == "internal_error":
            return "internal_error"

        return "completed_error"
