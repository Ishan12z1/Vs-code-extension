from __future__ import annotations

import json
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.planner.classifier import RequestClassification
from app.planner.policy import PlannerPolicy
from app.planner.schemas import PlanRequest
from app.planner.schemas.contracts import RequestClass

PromptMode = Literal["explanation", "plan"]


class PromptMessage(BaseModel):
    """
    One normalized prompt message entry.

    Backend-only contract.
    This is not a shared public API model.
    """

    model_config = ConfigDict(extra="forbid")

    role: Literal["system", "user"]
    content: str


class PlannerPromptPackage(BaseModel):
    """
    Backend-owned prompt package passed to planner providers.

    This keeps prompt construction outside provider SDK adapters.
    """

    model_config = ConfigDict(extra="forbid")

    mode: PromptMode
    requestClass: RequestClass
    messages: list[PromptMessage] = Field(default_factory=list)


class PlannerPromptBuilder:
    """
    Build normalized prompt packages for the planner provider.

    Step 6.4 goal:
    - freeze prompt structure
    - separate explanation vs plan paths
    - keep prompt building backend-owned and provider-agnostic
    """

    def build(
        self,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
    ) -> PlannerPromptPackage:
        """
        Build the correct prompt package based on the resolved request class.
        """
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

    def _build_explanation_prompt(
        self,
        *,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
    ) -> PlannerPromptPackage:
        """
        Prompt contract for explanation / diagnosis style responses.

        These requests should not produce executable actions in this path.
        """
        system_content = "\n".join(
            [
                "You are the planning backend for VS Code Control Agent.",
                "Your job in this prompt path is to return an explanation-oriented result.",
                "Do not generate execution steps or arbitrary actions in this mode.",
                "Stay within supported VS Code-native reasoning.",
                "Use the provided workspace snapshot and request classification.",
                "If the request is unsupported, return a clear refusal-oriented explanation.",
            ]
        )

        user_payload = {
            "requestText": payload.userRequest.text,
            "requestClassHint": payload.userRequest.requestClassHint,
            "resolvedRequestClass": classification.requestClass,
            "classificationReason": classification.reason,
            "workspaceSnapshot": payload.workspaceSnapshot.model_dump(mode="json"),
            "policyRules": policy.policyRules,
            "responseContract": {
                "kind": "explanation",
                "requestClassAllowed": ["explain", "inspect", "guide"],
                "mustNotGenerateActions": True,
            },
        }

        return PlannerPromptPackage(
            mode="explanation",
            requestClass=classification.requestClass,
            messages=[
                PromptMessage(role="system", content=system_content),
                PromptMessage(
                    role="user",
                    content=self._pretty_json(user_payload),
                ),
            ],
        )

    def _build_plan_prompt(
        self,
        *,
        payload: PlanRequest,
        classification: RequestClassification,
        policy: PlannerPolicy,
    ) -> PlannerPromptPackage:
        """
        Prompt contract for execution-plan style responses.

        These requests may generate structured actions, but only from the allowed
        action catalog and only within the bounded policy rules.
        """
        system_content = "\n".join(
            [
                "You are the planning backend for VS Code Control Agent.",
                "Your job in this prompt path is to return a bounded execution plan.",
                "Only use action types from the provided allowedActions catalog.",
                "Do not generate arbitrary shell or terminal execution.",
                "Do not generate arbitrary repo-wide source code edits.",
                "Do not widen scope silently from workspace to user.",
                "Use the default risk and approval posture from policy unless strong justification exists.",
                "If the request cannot be satisfied within the bounded action catalog, refuse clearly.",
            ]
        )

        user_payload = {
            "requestText": payload.userRequest.text,
            "requestClassHint": payload.userRequest.requestClassHint,
            "resolvedRequestClass": classification.requestClass,
            "classificationReason": classification.reason,
            "workspaceSnapshot": payload.workspaceSnapshot.model_dump(mode="json"),
            "allowedActions": [action.model_dump(mode="json") for action in policy.allowedActions],
            "policyRules": policy.policyRules,
            "responseContract": {
                "kind": "plan",
                "requestClassAllowed": ["configure", "repair", "guide"],
                "mustUseOnlyAllowedActions": True,
                "mustReturnStructuredPlan": True,
            },
        }

        return PlannerPromptPackage(
            mode="plan",
            requestClass=classification.requestClass,
            messages=[
                PromptMessage(role="system", content=system_content),
                PromptMessage(
                    role="user",
                    content=self._pretty_json(user_payload),
                ),
            ],
        )

    def _pretty_json(self, payload: dict) -> str:
        """
        Stable pretty JSON string for provider input.

        This makes prompt snapshots easier to inspect in tests and logs.
        """
        return json.dumps(payload, indent=2, sort_keys=True)
