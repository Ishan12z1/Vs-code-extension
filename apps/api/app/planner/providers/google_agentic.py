from __future__ import annotations

import importlib
from typing import Any

from app.planner.classifier import RequestClassification
from app.planner.policy import PlannerPolicy
from app.planner.prompts import PlannerPromptPackage
from app.planner.providers.base import PlannerProvider
from app.planner.providers.types import ProviderGenerationResult
from app.planner.schemas import PlanRequest


class GoogleAgenticPlannerProvider(PlannerProvider):
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
        sdk_response = self._invoke_google_sdk(prompt_text)

        raw_text = self._extract_response_text(sdk_response)
        response_id = self._safe_get_attr(sdk_response, "response_id")
        finish_reason = self._safe_get_attr(sdk_response, "finish_reason")

        return ProviderGenerationResult(
            rawText=raw_text,
            providerName=self.name,
            modelName=self._model_name,
            responseId=response_id,
            finishReason=finish_reason,
            metadata={
                "requestId": payload.userRequest.id,
                "resolvedRequestClass": classification.requestClass,
                "promptMode": prompt_package.mode,
                "supportsPlanning": policy.supportsPlanning,
            },
        )

    def _flatten_prompt(self, prompt_package: PlannerPromptPackage) -> str:
        """
        Turn the normalized prompt package into one stable text prompt.

        This keeps provider adapters thin and provider-agnostic.
        """
        parts: list[str] = []

        for message in prompt_package.messages:
            parts.append(f"{message.role.upper()}:\n{message.content}")

        return "\n\n".join(parts)

    def _invoke_google_sdk(self, prompt_text: str) -> Any:

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

        response = client.models.generate_content(model=self._model_name, contents=prompt_text)

        return response

    def _extract_response_text(self, sdk_response: Any) -> str:
        """
        Extract raw text from the SDK response.

        We prefer an obvious text field first. If none exists, stringify the
        response object so Step 6.6 still has something to inspect.
        """
        direct_text = self._safe_get_attr(sdk_response, "text")
        if isinstance(direct_text, str) and direct_text.strip():
            return direct_text

        # Some SDKs expose candidates/parts rather than a direct .text field.
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

    def _safe_get_attr(self, value: Any, name: str) -> Any:
        """
        Attribute access helper that never raises.
        """
        return getattr(value, name, None)
