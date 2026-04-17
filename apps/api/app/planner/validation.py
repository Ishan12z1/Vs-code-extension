from __future__ import annotations

import json
from json import JSONDecodeError
from typing import Any, Sequence

from pydantic import TypeAdapter, ValidationError

from app.planner.prompts import PlannerPromptPackage
from app.planner.providers.types import ProviderGenerationResult
from app.planner.schemas import ErrorPayload, PlanError, PlanResponse


class PlannerResponseValidator:
    """
    Validate raw provider output against the shared public planner response contract.

    Important:
    - providers return raw text
    - this validator is the first place that raw model output becomes trusted
    - invalid output must not escape into the public API as if it were valid
    """

    def __init__(self) -> None:
        # PlanResponse is a shared union alias in the mirrored Python contracts.
        self._response_adapter = TypeAdapter(PlanResponse)

    def validate(
        self,
        *,
        provider_result: ProviderGenerationResult,
        prompt_package: PlannerPromptPackage,
    ) -> PlanResponse:
        """
        Parse raw provider text, validate it against the shared response contract,
        and enforce basic mode consistency.
        """
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
            validated_response = self._response_adapter.validate_python(parsed_payload)
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
        """
        Extract a JSON candidate from raw model text.

        This supports the common case where a model wraps JSON inside Markdown
        code fences such as ```json ... ```.
        """
        text = raw_text.strip()

        if text.startswith("```"):
            lines = text.splitlines()

            # Drop the opening fence line, including ```json or ```text.
            if lines:
                lines = lines[1:]

            # Drop the closing fence if present.
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
        """
        Enforce basic consistency between the prompt path and returned payload type.

        Allowed combinations:
        - explanation mode -> explanation or error
        - plan mode -> plan or error
        """
        if response_kind == "error":
            return None

        if prompt_mode == "explanation" and response_kind != "explanation":
            return "Provider returned a non-explanation payload for explanation mode."

        if prompt_mode == "plan" and response_kind != "plan":
            return "Provider returned a non-plan payload for plan mode."

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
        """
        Return one structured invalid-plan response.

        This keeps bad provider output visible for debugging without allowing it
        to masquerade as a valid public plan/explanation response.
        """
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
