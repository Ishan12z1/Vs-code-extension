from __future__ import annotations

import importlib
import json
from typing import Any

from app.planner.classifier import RequestClassification
from app.planner.draft_schemas import DraftExecutionPlan
from app.planner.policy import PlannerPolicy
from app.planner.prompts import PlannerPromptPackage
from app.planner.providers.base import PlannerProvider
from app.planner.providers.types import ProviderGenerationResult
from app.planner.schemas import ExplanationResponse, PlanRequest


class GoogleAgenticPlannerProvider(PlannerProvider):
    """
    Real Google-backed planner provider adapter.

    Step change:
    - use structured JSON generation
    - target the smaller model-facing draft schema for plan mode
    - target explanation payload schema for explanation mode
    """

    name = "google_agentic"

    def __init__(
        self,
        *,
        api_key: str,
        model_name: str,
        timeout_seconds: int,
    ) -> None:
        self._api_key = api_key
        self._model_name = model_name
        self._timeout_seconds = timeout_seconds

    def generate(
        self,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
        prompt_package: PlannerPromptPackage,
    ) -> ProviderGenerationResult:
        prompt_text = self._flatten_prompt(prompt_package)
        response_schema = self._response_schema_for_mode(prompt_package.mode)

        sdk_response = self._invoke_google_sdk(
            prompt_text=prompt_text,
            response_schema=response_schema,
        )
        print(sdk_response)
        parsed_json = self._extract_parsed_json(sdk_response)
        raw_text = self._extract_response_text(sdk_response, parsed_json=parsed_json)

        response_id = self._safe_get_attr(sdk_response, "response_id")
        finish_reason = self._normalize_finish_reason(self._safe_get_attr(sdk_response, "finish_reason"))
        model_version = self._safe_get_attr(sdk_response, "model_version") or self._model_name

        return ProviderGenerationResult(
            rawText=raw_text,
            providerName=self.name,
            modelName=model_version,
            responseId=response_id,
            finishReason=finish_reason,
            parsedJson=parsed_json,
            metadata={
                "requestId": payload.userRequest.id,
                "resolvedRequestClass": classification.requestClass,
                "promptMode": prompt_package.mode,
                "supportsPlanning": policy.supportsPlanning,
            },
        )

    def _flatten_prompt(self, prompt_package: PlannerPromptPackage) -> str:
        parts: list[str] = []

        for message in prompt_package.messages:
            parts.append(f"{message.role.upper()}:\n{message.content}")

        return "\n\n".join(parts)

    def _response_schema_for_mode(self, mode: str) -> dict[str, Any]:
        """
        Return the exact structured JSON schema for the current prompt mode.
        """
        if mode in {"plan", "retry"}:
            return DraftExecutionPlan.model_json_schema()

        if mode == "explanation":
            return ExplanationResponse.model_json_schema()

        raise ValueError(f"Unsupported prompt mode: {mode}")

    def _invoke_google_sdk(
        self,
        *,
        prompt_text: str,
        response_schema: dict[str, Any],
    ) -> Any:
        """
        Best-effort Google SDK invocation with structured JSON output.

        Honest note:
        - exact SDK surfaces can differ by installed package version
        - keep adjustments isolated here only
        """
        try:
            google_genai = importlib.import_module("google.genai")
        except ImportError as exc:
            raise RuntimeError(
                "Google SDK import failed. Install the Google SDK used by your "
                "environment and adjust _invoke_google_sdk if needed."
            ) from exc

        client_class = getattr(google_genai, "Client", None)
        if client_class is None:
            raise RuntimeError(
                "google.genai.Client was not found. Adjust the adapter to match your installed Google SDK."
            )

        client = client_class(api_key=self._api_key)

        # Some versions expose config types via google.genai.types
        types_module = getattr(google_genai, "types", None)

        config = None
        if types_module is not None:
            generate_content_config = getattr(types_module, "GenerateContentConfig", None)
            if generate_content_config is not None:
                # Prefer the more explicit response_json_schema path.
                try:
                    config = generate_content_config(
                        response_mime_type="application/json",
                        response_json_schema=response_schema,
                    )
                except TypeError:
                    # Fallback for SDK variants that use response_schema instead.
                    config = generate_content_config(
                        response_mime_type="application/json",
                        response_schema=response_schema,
                    )

        if config is not None:
            return client.models.generate_content(
                model=self._model_name,
                contents=prompt_text,
                config=config,
            )

        # Last-resort fallback if config types are unavailable in the installed SDK.
        try:
            return client.models.generate_content(
                model=self._model_name,
                contents=prompt_text,
                response_mime_type="application/json",
                response_json_schema=response_schema,
            )
        except TypeError:
            return client.models.generate_content(
                model=self._model_name,
                contents=prompt_text,
                response_mime_type="application/json",
                response_schema=response_schema,
            )

    def _extract_parsed_json(self, sdk_response: Any) -> Any | None:
        """
        Prefer SDK-parsed structured output when available.
        """
        parsed = self._safe_get_attr(sdk_response, "parsed")
        if parsed is not None:
            return parsed

        direct_text = self._safe_get_attr(sdk_response, "text")
        if isinstance(direct_text, str) and direct_text.strip():
            try:
                return json.loads(direct_text)
            except json.JSONDecodeError:
                return None

        candidates = self._safe_get_attr(sdk_response, "candidates")
        if isinstance(candidates, list):
            fragments: list[str] = []

            for candidate in candidates:
                content = self._safe_get_attr(candidate, "content")
                parts = self._safe_get_attr(content, "parts")
                if isinstance(parts, list):
                    for part in parts:
                        text = self._safe_get_attr(part, "text")
                        if isinstance(text, str) and text.strip():
                            fragments.append(text)

            joined = "\n".join(fragments).strip()
            if joined:
                try:
                    return json.loads(joined)
                except json.JSONDecodeError:
                    return None

        return None

    def _extract_response_text(self, sdk_response: Any, *, parsed_json: Any | None) -> str:
        """
        Keep both parsed JSON and raw text visible for debugging.
        """
        if parsed_json is not None:
            try:
                return json.dumps(parsed_json, indent=2, sort_keys=True)
            except TypeError:
                pass

        direct_text = self._safe_get_attr(sdk_response, "text")
        if isinstance(direct_text, str) and direct_text.strip():
            return direct_text

        candidates = self._safe_get_attr(sdk_response, "candidates")
        if isinstance(candidates, list):
            fragments: list[str] = []

            for candidate in candidates:
                content = self._safe_get_attr(candidate, "content")
                parts = self._safe_get_attr(content, "parts")
                if isinstance(parts, list):
                    for part in parts:
                        text = self._safe_get_attr(part, "text")
                        if isinstance(text, str) and text.strip():
                            fragments.append(text)

            if fragments:
                return "\n".join(fragments)

        return str(sdk_response)

    def _normalize_finish_reason(self, value: Any) -> str | None:
        if value is None:
            return None
        name = getattr(value, "name", None)
        if isinstance(name, str):
            return name
        text = str(value)
        return text if text else None

    def _safe_get_attr(self, value: Any, name: str) -> Any:
        return getattr(value, name, None)
