from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.planner.schemas.contracts import (
    ActionScope,
    ActionType,
    RequestClass,
    RiskLevel,
)


class AllowedActionPolicy(BaseModel):
    """
    Backend-only policy entry for one supported planner action.

    Important:
    - this is NOT a shared public API contract
    - it is internal planner policy input
    - it is derived from the already-shared ActionType / ActionScope / RiskLevel
      contract values
    """

    model_config = ConfigDict(extra="forbid")

    actionType: ActionType
    allowedScopes: list[ActionScope] = Field(default_factory=list)
    defaultRiskLevel: RiskLevel
    requiresApprovalByDefault: bool
    description: str


class PlannerPolicy(BaseModel):
    """
    Backend-only planner policy bundle.

    This is the bounded policy input that later planner providers must obey.
    """

    model_config = ConfigDict(extra="forbid")

    requestClass: RequestClass
    supportsPlanning: bool
    allowedActions: list[AllowedActionPolicy] = Field(default_factory=list)
    policyRules: list[str] = Field(default_factory=list)


class PlannerPolicyBuilder:
    """
    Build planner policy from the resolved request class.

    Step 6.3 goal:
    - define allowed actions
    - define default risk / approval posture
    - define hard planner guardrails

    We keep this deterministic and backend-owned.
    """

    def build(self, request_class: RequestClass) -> PlannerPolicy:
        """
        Return the bounded policy bundle for the resolved request class.
        """
        if request_class in ("explain", "inspect"):
            return PlannerPolicy(
                requestClass=request_class,
                supportsPlanning=False,
                allowedActions=[],
                policyRules=self._base_policy_rules(),
            )

        if request_class in ("configure", "repair", "guide"):
            return PlannerPolicy(
                requestClass=request_class,
                supportsPlanning=True,
                allowedActions=self._supported_execution_actions(),
                policyRules=self._base_policy_rules(),
            )

        # Defensive fallback. Current shared RequestClass already limits values,
        # but this keeps the policy builder honest if the enum widens later.
        return PlannerPolicy(
            requestClass="guide",
            supportsPlanning=False,
            allowedActions=[],
            policyRules=self._base_policy_rules(),
        )

    def _supported_execution_actions(self) -> list[AllowedActionPolicy]:
        """
        Supported action catalog for v1 planning.

        This mirrors the action types already frozen in the shared contracts and
        adds backend-owned default risk / approval policy.
        """
        return [
            AllowedActionPolicy(
                actionType="updateUserSettings",
                allowedScopes=["user"],
                defaultRiskLevel="medium",
                requiresApprovalByDefault=True,
                description="Update user-level VS Code settings.",
            ),
            AllowedActionPolicy(
                actionType="updateWorkspaceSettings",
                allowedScopes=["workspace"],
                defaultRiskLevel="low",
                requiresApprovalByDefault=False,
                description="Update workspace-scoped VS Code settings.",
            ),
            AllowedActionPolicy(
                actionType="patchVscodeSettingsJson",
                allowedScopes=["workspaceFile"],
                defaultRiskLevel="medium",
                requiresApprovalByDefault=True,
                description="Patch .vscode/settings.json in the current workspace.",
            ),
            AllowedActionPolicy(
                actionType="patchTasksJson",
                allowedScopes=["workspaceFile"],
                defaultRiskLevel="medium",
                requiresApprovalByDefault=True,
                description="Patch .vscode/tasks.json in the current workspace.",
            ),
            AllowedActionPolicy(
                actionType="patchLaunchJson",
                allowedScopes=["workspaceFile"],
                defaultRiskLevel="medium",
                requiresApprovalByDefault=True,
                description="Patch .vscode/launch.json in the current workspace.",
            ),
            AllowedActionPolicy(
                actionType="patchExtensionsJson",
                allowedScopes=["workspaceFile"],
                defaultRiskLevel="medium",
                requiresApprovalByDefault=True,
                description="Patch .vscode/extensions.json recommendations.",
            ),
            AllowedActionPolicy(
                actionType="updateKeybindings",
                allowedScopes=["user"],
                defaultRiskLevel="medium",
                requiresApprovalByDefault=True,
                description="Update user keybindings for supported commands.",
            ),
        ]

    def _base_policy_rules(self) -> list[str]:
        """
        Global planner guardrails.

        These are backend-owned policy statements, not provider behavior.
        """
        return [
            "Do not generate arbitrary shell or terminal execution steps.",
            "Do not generate arbitrary repo source-code edits as planner actions.",
            "Do not invent unsupported action types outside the shared action catalog.",
            "Do not silently widen scope from workspace to user settings.",
            "Any medium-risk change must be previewable and approval-aware.",
            "Prefer native VS Code surfaces over generic automation.",
        ]
