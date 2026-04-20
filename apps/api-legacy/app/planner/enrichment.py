from __future__ import annotations

from typing import Any

from app.planner.draft_schemas import DraftExecutionPlan, DraftPlannedAction
from app.planner.policy import PlannerPolicy
from app.planner.schemas import ActionPreview, ApprovalRequirement, ExecutionPlan, PlannedAction, PlanPayload
from app.planner.schemas.contracts import RiskLevel, WorkspaceSnapshot


class PlanDraftEnricher:
    """
    Convert a smaller model-facing draft plan into the full shared execution plan.

    This is where backend-owned metadata gets filled in deterministically.
    """

    def enrich(
        self,
        *,
        draft: DraftExecutionPlan,
        policy: PlannerPolicy,
        workspace_snapshot: WorkspaceSnapshot,
    ) -> PlanPayload:
        enriched_actions = [
            self._enrich_action(
                action=action,
                policy=policy,
                workspace_snapshot=workspace_snapshot,
            )
            for action in draft.actions
        ]

        highest_risk = self._highest_risk([action.riskLevel for action in enriched_actions])
        approval_required = any(action.requiresApproval for action in enriched_actions)

        approval = ApprovalRequirement(
            required=approval_required,
            reason=(
                "One or more actions require approval under the current planner policy."
                if approval_required
                else "No planned action requires approval under the current planner policy."
            ),
            riskLevel=highest_risk,
        )

        return PlanPayload(
            kind="plan",
            data=ExecutionPlan(
                id=draft.id,
                summary=draft.summary,
                explanation=draft.explanation,
                requestClass=draft.requestClass,
                approval=approval,
                actions=enriched_actions,
            ),
        )

    def _enrich_action(
        self,
        *,
        action: DraftPlannedAction,
        policy: PlannerPolicy,
        workspace_snapshot: WorkspaceSnapshot,
    ) -> PlannedAction:
        policy_entry = self._find_policy_entry(policy, action.actionType)

        requires_approval = policy_entry.requiresApprovalByDefault if policy_entry is not None else True

        preview = self._build_preview(
            action=action,
            workspace_snapshot=workspace_snapshot,
        )

        return PlannedAction(
            id=action.id,
            actionType=action.actionType,
            scope=action.scope,
            target=action.target,
            parameters=action.parameters,
            riskLevel=action.riskLevel,
            requiresApproval=requires_approval,
            preview=preview,
            executionMethod=self._execution_method_for_action(action.actionType),
            rollbackMethod=self._rollback_method_for_action(action.actionType),
        )

    def _find_policy_entry(self, policy: PlannerPolicy, action_type: str):
        for entry in policy.allowedActions:
            if entry.actionType == action_type:
                return entry
        return None

    def _build_preview(
        self,
        *,
        action: DraftPlannedAction,
        workspace_snapshot: WorkspaceSnapshot,
    ) -> ActionPreview:
        before_value: Any | None = None
        after_value: Any | None = None

        if action.actionType == "updateWorkspaceSettings":
            before_value = workspace_snapshot.relevantWorkspaceSettings.get(action.target)

            if "value" in action.parameters:
                after_value = action.parameters["value"]
            elif "settings" in action.parameters and isinstance(action.parameters["settings"], dict):
                after_value = action.parameters["settings"].get(action.target)
            else:
                after_value = action.parameters

        elif action.actionType == "updateUserSettings":
            before_value = workspace_snapshot.relevantUserSettings.get(action.target)

            if "value" in action.parameters:
                after_value = action.parameters["value"]
            elif "settings" in action.parameters and isinstance(action.parameters["settings"], dict):
                after_value = action.parameters["settings"].get(action.target)
            else:
                after_value = action.parameters

        elif action.actionType == "patchVscodeSettingsJson":
            before_value = workspace_snapshot.vscodeFiles.settingsJson.parsedContent
            after_value = action.parameters

        elif action.actionType == "patchTasksJson":
            before_value = workspace_snapshot.vscodeFiles.tasksJson.parsedContent
            after_value = action.parameters

        elif action.actionType == "patchLaunchJson":
            before_value = workspace_snapshot.vscodeFiles.launchJson.parsedContent
            after_value = action.parameters

        elif action.actionType == "patchExtensionsJson":
            before_value = workspace_snapshot.vscodeFiles.extensionsJson.parsedContent
            after_value = action.parameters

        elif action.actionType == "updateKeybindings":
            before_value = None
            after_value = action.parameters

        return ActionPreview(
            summary=self._preview_summary_for_action(action),
            targetLabel=action.target,
            before=before_value,
            after=after_value,
        )

    def _preview_summary_for_action(self, action: DraftPlannedAction) -> str:
        return {
            "updateUserSettings": "Update a user-level VS Code setting.",
            "updateWorkspaceSettings": "Update a workspace-level VS Code setting.",
            "patchVscodeSettingsJson": "Patch .vscode/settings.json.",
            "patchTasksJson": "Patch .vscode/tasks.json.",
            "patchLaunchJson": "Patch .vscode/launch.json.",
            "patchExtensionsJson": "Patch .vscode/extensions.json.",
            "updateKeybindings": "Update a VS Code user keybinding.",
        }.get(action.actionType, "Apply a VS Code configuration change.")

    def _execution_method_for_action(self, action_type: str) -> str:
        return {
            "updateUserSettings": "vscodeConfigurationUpdate:user",
            "updateWorkspaceSettings": "vscodeConfigurationUpdate:workspace",
            "patchVscodeSettingsJson": "jsoncPatch:.vscode/settings.json",
            "patchTasksJson": "jsoncPatch:.vscode/tasks.json",
            "patchLaunchJson": "jsoncPatch:.vscode/launch.json",
            "patchExtensionsJson": "jsoncPatch:.vscode/extensions.json",
            "updateKeybindings": "keybindingsJsonPatch:user",
        }[action_type]

    def _rollback_method_for_action(self, action_type: str) -> str:
        return {
            "updateUserSettings": "restorePreviousSettingValue:user",
            "updateWorkspaceSettings": "restorePreviousSettingValue:workspace",
            "patchVscodeSettingsJson": "restoreFileSnapshot:.vscode/settings.json",
            "patchTasksJson": "restoreFileSnapshot:.vscode/tasks.json",
            "patchLaunchJson": "restoreFileSnapshot:.vscode/launch.json",
            "patchExtensionsJson": "restoreFileSnapshot:.vscode/extensions.json",
            "updateKeybindings": "restoreKeybindingsSnapshot:user",
        }[action_type]

    def _highest_risk(self, risks: list[RiskLevel]) -> RiskLevel:
        order = {"low": 1, "medium": 2, "high": 3}
        return max(risks, key=lambda item: order[item], default="low")  # type: ignore
