from __future__ import annotations

import json
from json import JSONDecodeError
from typing import Any

from pydantic import ValidationError

from app.planner.draft_schemas import (
    DraftExecutionPlan,
    validate_model_draft_execution_plan,
    validate_model_explanation_response,
)
from app.planner.enrichment import PlanDraftEnricher
from app.planner.policy import PlannerPolicy
from app.planner.prompts import PlannerPromptPackage
from app.planner.providers.types import ProviderGenerationResult
from app.planner.schemas import (
    ErrorPayload,
    ExplanationPayload,
    PlanError,
    PlanResponse,
    WorkspaceSnapshot,
    validate_plan_response,
)


class PlannerResponseValidator:
    """
    Validate model-facing structured output, enrich draft plans into full shared
    plans, then validate the final shared response contract.
    """

    def __init__(self, enricher: PlanDraftEnricher | None = None) -> None:
        self._enricher = enricher or PlanDraftEnricher()

    def validate(
        self,
        *,
        provider_result: ProviderGenerationResult,
        prompt_package: PlannerPromptPackage,
        policy: PlannerPolicy,
        workspace_snapshot: WorkspaceSnapshot,
    ) -> PlanResponse:
        candidate_payload = self._extract_payload(provider_result)

        if candidate_payload is None:
            return self._invalid_payload(
                provider_result=provider_result,
                prompt_package=prompt_package,
                reason="Provider output was not valid JSON.",
            )

        candidate_payload = self._normalize_model_payload(candidate_payload)

        try:
            if prompt_package.mode == "explanation":
                model_response = validate_model_explanation_response(candidate_payload)

                wrapped_explanation = ExplanationPayload(
                    kind="explanation",
                    data=model_response,
                )

                return validate_plan_response(wrapped_explanation.model_dump(mode="json"))

            model_response = validate_model_draft_execution_plan(candidate_payload)

        except ValidationError as exc:
            return self._invalid_payload(
                provider_result=provider_result,
                prompt_package=prompt_package,
                reason="Provider output did not match the model-facing response schema.",
                validation_errors=exc.errors(),
            )

        assert isinstance(model_response, DraftExecutionPlan)

        enriched_plan = self._enricher.enrich(
            draft=model_response,
            policy=policy,
            workspace_snapshot=workspace_snapshot,
        )

        try:
            return validate_plan_response(enriched_plan.model_dump(mode="json"))
        except ValidationError as exc:
            return self._invalid_payload(
                provider_result=provider_result,
                prompt_package=prompt_package,
                reason="Enriched plan did not match the shared planner response schema.",
                validation_errors=exc.errors(),
            )

    def _extract_payload(self, provider_result: ProviderGenerationResult) -> dict[str, Any] | None:
        if isinstance(provider_result.parsedJson, dict):
            return provider_result.parsedJson

        candidate_json = self._extract_json_candidate(provider_result.rawText)

        try:
            parsed = json.loads(candidate_json)
        except JSONDecodeError:
            return None

        return parsed if isinstance(parsed, dict) else None

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

    def _invalid_payload(
        self,
        *,
        provider_result: ProviderGenerationResult,
        prompt_package: PlannerPromptPackage,
        reason: str,
        validation_errors: list[dict[str, Any]] | None = None,
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

        if validation_errors is not None:
            details["validationErrors"] = validation_errors

        return ErrorPayload(
            kind="error",
            error=PlanError(
                code="invalid_plan_payload",
                message="Provider output did not match the planner response contract.",
                details=details,
            ),
        )

    def _normalize_model_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        """
        Apply tiny mechanical normalization before model-facing validation.

        This is intentionally narrow:
        - remove known wrapper/type names from plan generation
        - normalize kind casing only when present
        - do not invent missing semantic fields
        """
        normalized = dict(payload)

        kind = normalized.get("kind")
        if isinstance(kind, str):
            lowered = kind.strip().lower()

            if lowered in {"plan", "explanation", "error"}:
                normalized["kind"] = lowered
                return normalized

            # In plan/retry mode the model should not be generating transport
            # wrapper kinds at all. Convert known plan-like aliases into the
            # underlying draft plan object.
            if lowered in {"executionplan", "draftexecutionplan"}:
                data = normalized.get("data")
                if isinstance(data, dict):
                    return data

        return normalized
