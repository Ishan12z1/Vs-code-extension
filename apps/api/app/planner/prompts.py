from __future__ import annotations

import json
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.planner.classifier import RequestClassification
from app.planner.policy import PlannerPolicy
from app.planner.providers.types import ProviderGenerationResult
from app.planner.schemas import PlanRequest
from app.planner.schemas.contracts import RequestClass

PromptMode = Literal["explanation", "plan", "retry"]


class PromptMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["system", "user"]
    content: str


class PlannerPromptPackage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: PromptMode
    requestClass: RequestClass
    messages: list[PromptMessage] = Field(default_factory=list)


class PlannerPromptBuilder:
    """
    Prompt builder after switching to structured JSON generation.

    Because the schema now enforces output shape, the prompt can stay shorter and
    focus on intent, policy, and domain constraints.
    """

    def build(
        self,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
    ) -> PlannerPromptPackage:

        if classification.requestClass in ("explain", "inspect"):
            return self._build_explanation_prompt(
                payload=payload,
                classification=classification,
                policy=policy,
            )

        return self._build_plan_prompt(
            payload=payload,
            classification=classification,
            policy=policy,
        )

    def build_retry_for_invalid_output(
        self,
        *,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
        previous_prompt: PlannerPromptPackage,
        previous_provider_result: ProviderGenerationResult,
        validation_reason: str,
    ) -> PlannerPromptPackage:
        retry_payload = {
            "task": "Correct your previous response so it matches the required draft execution plan JSON schema.",
            "validationReason": validation_reason,
            "requestText": payload.userRequest.text,
            "resolvedRequestClass": classification.requestClass,
            "allowedActions": [action.model_dump(mode="json") for action in policy.allowedActions],
            "policyRules": policy.policyRules,
            "workspaceSnapshot": payload.workspaceSnapshot.model_dump(mode="json"),
            "previousRawOutput": previous_provider_result.rawText[:4000],
        }

        return PlannerPromptPackage(
            mode="retry",
            requestClass=classification.requestClass,
            messages=[
                PromptMessage(
                    role="system",
                    content=("Return corrected structured JSON only. Do not add prose or markdown fences."),
                ),
                PromptMessage(role="user", content=self._pretty_json(retry_payload)),
            ],
        )

    def _build_explanation_prompt(
        self,
        *,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
    ) -> PlannerPromptPackage:
        user_payload = {
            "task": "Explain the user's VS Code situation using the workspace snapshot.",
            "requestText": payload.userRequest.text,
            "resolvedRequestClass": classification.requestClass,
            "workspaceSnapshot": payload.workspaceSnapshot.model_dump(mode="json"),
            "policyRules": policy.policyRules,
        }

        return PlannerPromptPackage(
            mode="explanation",
            requestClass=classification.requestClass,
            messages=[
                PromptMessage(
                    role="system",
                    content=("You are the VS Code Control Agent planner. Return structured JSON only."),
                ),
                PromptMessage(role="user", content=self._pretty_json(user_payload)),
            ],
        )

    def _build_plan_prompt(
        self,
        *,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
    ) -> PlannerPromptPackage:
        user_payload = {
            "task": "Produce a bounded VS Code execution plan draft object.",
            "requestText": payload.userRequest.text,
            "resolvedRequestClass": classification.requestClass,
            "workspaceSnapshot": payload.workspaceSnapshot.model_dump(mode="json"),
            "allowedActions": [action.model_dump(mode="json") for action in policy.allowedActions],
            "policyRules": policy.policyRules,
            "notes": [
                "Stay within the allowed action catalog.",
                "Do not generate shell commands.",
                "Do not generate arbitrary source code edits.",
                "Use only the supported VS Code-native surfaces.",
            ],
        }

        return PlannerPromptPackage(
            mode="plan",
            requestClass=classification.requestClass,
            messages=[
                PromptMessage(
                    role="system",
                    content=("You are the VS Code Control Agent planner. Return structured JSON only."),
                ),
                PromptMessage(role="user", content=self._pretty_json(user_payload)),
            ],
        )

    def _pretty_json(self, payload: dict) -> str:
        return json.dumps(payload, indent=2, sort_keys=True)
