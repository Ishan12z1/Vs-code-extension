from __future__ import annotations

import json
from json import JSONDecodeError
from typing import Any, Sequence

from pydantic import ValidationError

from app.planner.prompts import PlannerPromptPackage
from app.planner.providers.types import ProviderGenerationResult
from app.planner.schemas import ErrorPayload, PlanError, PlanResponse, validate_plan_response


class PlannerResponseValidator:
    """
    Validate raw provider output against the shared public planner response contract.
    """

    def validate(
        self,
        *,
        provider_result: ProviderGenerationResult,
        prompt_package: PlannerPromptPackage,
    ) -> PlanResponse:
        candidate_json = self._extract_json_candidate(provider_result.rawText)

        try:
            parsed_payload = json.loads(candidate_json)
        except JSONDecodeError as exc:
            return self._invalid_payload(
                provider_result=provider_result,
                prompt_package=prompt_package,
                reason="Provider output was not valid JSON.",
                parse_error=str(exc),
            )

        try:
            validated_response = validate_plan_response(parsed_payload)
        except ValidationError as exc:
            return self._invalid_payload(
                provider_result=provider_result,
                prompt_package=prompt_package,
                reason=("Provider output did not match the shared planner response schema."),
                validation_errors=exc.errors(),
            )

        mode_mismatch_reason = self._get_mode_mismatch_reason(
            prompt_mode=prompt_package.mode,
            response_kind=validated_response.kind,
        )
        if mode_mismatch_reason is not None:
            return self._invalid_payload(
                provider_result=provider_result,
                prompt_package=prompt_package,
                reason=mode_mismatch_reason,
            )

        return validated_response

    def _extract_json_candidate(self, raw_text: str) -> str:
        text = raw_text.strip()

        if text.startswith("```"):
            lines = text.splitlines()

            if lines:
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            text = "\n".join(lines).strip()

        return text

    def _get_mode_mismatch_reason(
        self,
        *,
        prompt_mode: str,
        response_kind: str,
    ) -> str | None:
        if response_kind == "error":
            return None

        if prompt_mode in {"explanation"} and response_kind != "explanation":
            return "Provider returned a non-explanation payload for explanation mode."

        if prompt_mode in {"plan", "retry"} and response_kind != "plan":
            return "Provider returned a non-plan payload for plan/retry mode."

        return None

    def _invalid_payload(
        self,
        *,
        provider_result: ProviderGenerationResult,
        prompt_package: PlannerPromptPackage,
        reason: str,
        parse_error: str | None = None,
        validation_errors: Sequence[Any] | None = None,
    ) -> ErrorPayload:
        details: dict[str, Any] = {
            "provider": provider_result.providerName,
            "providerModel": provider_result.modelName,
            "providerResponseId": provider_result.responseId,
            "providerFinishReason": provider_result.finishReason,
            "promptMode": prompt_package.mode,
            "rawTextPreview": provider_result.rawText[:1000],
            "reason": reason,
        }

        if parse_error is not None:
            details["parseError"] = parse_error

        if validation_errors is not None:
            details["validationErrors"] = validation_errors

        return ErrorPayload(
            kind="error",
            error=PlanError(
                code="invalid_plan_payload",
                message=("Provider output did not match the shared planner response contract."),
                details=details,
            ),
        )
