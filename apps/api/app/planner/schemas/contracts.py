from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

# Shared literal types kept aligned with the TypeScript contracts package.
RequestClass = Literal["explain", "inspect", "configure", "repair", "guide"]
RiskLevel = Literal["low", "medium", "high"]
ApprovalDecision = Literal["approved", "rejected", "cancelled"]
ActionType = Literal[
    "updateUserSettings",
    "updateWorkspaceSettings",
    "patchVscodeSettingsJson",
    "patchTasksJson",
    "patchLaunchJson",
    "patchExtensionsJson",
    "updateKeybindings",
]
ActionScope = Literal["user", "workspace", "workspaceFile"]
ExecutionResultStatus = Literal["pending", "succeeded", "failed", "skipped"]
PlanErrorCode = Literal[
    "invalid_request_payload",
    "invalid_plan_payload",
    "unsupported_request",
    "not_implemented",
    "internal_error",
]


class ContractModel(BaseModel):
    """
    Base class for shared contract models.

    Important:
    - extra fields are forbidden
    - this prevents drifted fields like created_at from being silently ignored
    """

    model_config = ConfigDict(extra="forbid")


class UserRequest(ContractModel):
    """
    Basic user request payload mirrored from the TypeScript contracts.
    """

    id: str
    text: str
    requestClassHint: RequestClass | None = None
    createdAt: datetime | None = None


class WorkspaceFolder(ContractModel):
    """
    One workspace folder entry.
    """

    name: str
    uri: str


class InstalledTargetExtension(ContractModel):
    """
    Selected installed extension state.
    """

    id: str
    installed: bool
    version: str | None = None
    isActive: bool = False


class KeybindingSignal(ContractModel):
    """
    Keybinding-related signal captured from the extension.
    """

    command: str
    available: bool
    keybinding: str | None = None
    note: str | None = None


class VscodeFileInspection(ContractModel):
    """
    Normalized inspection result for one .vscode/* file.

    Shared contract key is parsedContent on both TS and Python.
    """

    relativePath: str
    exists: bool
    parseStatus: Literal["not_found", "parsed", "invalid_jsonc"]
    parsedContent: Any | None = None
    parseError: str | None = None


class VscodeFilesSnapshot(ContractModel):
    """
    Grouped .vscode/* file inspection state.
    """

    settingsJson: VscodeFileInspection
    tasksJson: VscodeFileInspection
    launchJson: VscodeFileInspection
    extensionsJson: VscodeFileInspection


class WorkspaceSnapshot(ContractModel):
    """
    Normalized workspace snapshot mirrored from the TypeScript contracts.
    """

    workspaceFolders: List[WorkspaceFolder] = Field(default_factory=list)
    hasWorkspaceFile: bool = False
    vscodeFolderPresent: bool = False
    detectedMarkers: List[str] = Field(default_factory=list)
    installedExtensions: List[str] = Field(default_factory=list)
    relevantFiles: List[str] = Field(default_factory=list)

    relevantUserSettings: Dict[str, Any] = Field(default_factory=dict)
    relevantWorkspaceSettings: Dict[str, Any] = Field(default_factory=dict)
    installedTargetExtensions: List[InstalledTargetExtension] = Field(default_factory=list)
    keybindingSignals: List[KeybindingSignal] = Field(default_factory=list)

    vscodeFiles: VscodeFilesSnapshot
    notes: List[str] = Field(default_factory=list)


class ApprovalRequirement(ContractModel):
    """
    Approval requirement for a generated plan.
    """

    required: bool
    reason: str
    riskLevel: RiskLevel


class ActionPreview(ContractModel):
    """
    User-visible preview of one planned action.
    """

    summary: str
    targetLabel: str
    before: Any | None = None
    after: Any | None = None
    diffText: str | None = None


class PlannedAction(ContractModel):
    """
    One normalized action in a plan.
    """

    id: str
    actionType: ActionType
    scope: ActionScope
    target: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    riskLevel: RiskLevel
    requiresApproval: bool
    preview: ActionPreview
    executionMethod: str
    rollbackMethod: str


class ExecutionPlan(ContractModel):
    """
    Structured execution plan for configure/repair/guide requests.
    """

    id: str
    summary: str
    explanation: str
    requestClass: Literal["configure", "repair", "guide"]
    approval: ApprovalRequirement
    actions: List[PlannedAction]


class ExplanationResponse(ContractModel):
    """
    Structured explanation response for explain/inspect flows.
    """

    id: str
    requestClass: Literal["explain", "inspect", "guide"]
    title: str
    explanation: str
    suggestedNextSteps: List[str] = Field(default_factory=list)


class ExecutionResult(ContractModel):
    """
    Structured result for one executed action.
    """

    planId: str
    actionId: str
    status: ExecutionResultStatus
    success: bool
    message: str
    changedTargets: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class RollbackSnapshot(ContractModel):
    """
    Structured rollback payload for one action.
    """

    actionId: str
    target: str
    snapshotKind: str
    snapshotData: Any
    createdAt: datetime | None = None


class ApprovalDecisionRecord(ContractModel):
    """
    Durable approval decision record shared by the backend and extension.
    """

    runId: str
    planId: str
    decision: ApprovalDecision
    decidedAt: datetime
    reason: str | None = None


class PlanRequest(ContractModel):
    """
    Planner API input:
    - user request
    - workspace snapshot
    """

    userRequest: UserRequest
    workspaceSnapshot: WorkspaceSnapshot


class WorkspaceSnapshotAcceptanceRequest(ContractModel):
    """
    Workspace snapshot acceptance request.
    """

    snapshot: WorkspaceSnapshot
    collectedAt: datetime
    source: Literal["vscode-extension"] = "vscode-extension"


class WorkspaceSnapshotAcceptanceSummary(ContractModel):
    """
    Small backend-produced summary of what was accepted.
    """

    workspaceFolderCount: int
    detectedMarkerCount: int
    relevantFileCount: int
    installedTargetExtensionCount: int
    parsedVscodeFileCount: int
    invalidVscodeFileCount: int
    noteCount: int


class WorkspaceSnapshotAcceptanceResponse(ContractModel):
    """
    Workspace snapshot acceptance response.
    """

    accepted: bool
    message: str
    summary: WorkspaceSnapshotAcceptanceSummary
    warnings: List[str] = Field(default_factory=list)


class PlanError(ContractModel):
    """
    Structured planner/backend error payload.
    """

    code: PlanErrorCode
    message: str
    details: Dict[str, Any] | None = None


class PlanPayload(ContractModel):
    """
    Successful plan payload wrapper.
    """

    kind: Literal["plan"]
    data: ExecutionPlan


class ExplanationPayload(ContractModel):
    """
    Successful explanation payload wrapper.
    """

    kind: Literal["explanation"]
    data: ExplanationResponse


class ErrorPayload(ContractModel):
    """
    Structured error payload wrapper.
    """

    kind: Literal["error"]
    error: PlanError


PlanResponse = Union[PlanPayload, ExplanationPayload, ErrorPayload]


class ApprovalDecisionRequest(ContractModel):
    """
    Approval decision request for future approval endpoints.
    """

    runId: str
    planId: str
    decision: ApprovalDecision
    reason: str | None = None


class ApprovalDecisionResponse(ContractModel):
    """
    Approval decision response carrying the stored approval record.
    """

    approved: bool
    record: ApprovalDecisionRecord


def validate_execution_plan(payload: dict) -> ExecutionPlan:
    """
    Small helper used by the backend to validate a generated execution plan.
    """
    return ExecutionPlan.model_validate(payload)
