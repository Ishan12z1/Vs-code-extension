from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Union

from pydantic import BaseModel, Field

# Shared literal types.
#
#  keeps these aligned with the TypeScript Zod enums.
RequestClass = Literal["explain", "inspect", "configure", "repair", "guide"]
RiskLevel = Literal["low", "medium", "high"]
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


class UserRequest(BaseModel):
    """
    Mirrors the shared UserRequest contract from the TypeScript package.

    """

    id: str
    text: str
    requestClassHint: RequestClass | None = None
    createdAt: datetime | None = None


class WorkspaceFolder(BaseModel):
    """
    One workspace folder entry.
    """

    name: str
    uri: str


class InstalledTargetExtension(BaseModel):
    """
    Selected installed extension state.
    """

    id: str
    installed: bool
    version: str | None = None
    isActive: bool = False


class KeybindingSignal(BaseModel):
    """
    Keybinding-related signal captured from the extension.
    """

    command: str
    available: bool
    keybinding: str | None = None
    note: str | None = None


class VscodeFileInspection(BaseModel):
    """
    Normalized inspection result for one .vscode/* file.

    """

    relativePath: str
    exists: bool
    parseStatus: Literal["not_found", "parsed", "invalid_jsonc"]
    parsedConteny: Any | None = None
    parseError: str | None = None


class VscodeFilesSnapshot(BaseModel):
    """
    Grouped .vscode/* file inspection state.
    """

    settingsJson: VscodeFileInspection
    tasksJson: VscodeFileInspection
    launchJson: VscodeFileInspection
    extensionsJson: VscodeFileInspection


class WorkspaceSnapshot(BaseModel):
    """
    Normalized workspace snapshot mirrored from the TypeScript contracts package.
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


class ApprovalRequirement(BaseModel):
    """
    Approval requirement for a plan.
    """

    required: bool
    reason: str
    riskLevel: RiskLevel


class ActionPreview(BaseModel):
    """
    User-visible preview for one planned action.
    """

    summary: str
    targetLabel: str
    before: Any | None = None
    after: Any | None = None
    diffText: str | None = None


class PlannedAction(BaseModel):
    """
    One normalized action in an execution plan.
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


class ExecutionPlan(BaseModel):
    """
    Structured plan returned by the backend for configure/repair/guide flows.
    """

    id: str
    summary: str
    explanation: str
    requestClass: Literal["configure", "repair", "guide"]
    approval: ApprovalRequirement
    actions: List[PlannedAction]


class ExplanationResponse(BaseModel):
    """
    Structured explanation/diagnosis response.
    """

    id: str
    requestClass: Literal["explain", "inspect", "guide"]
    title: str
    explanation: str
    suggestedNextSteps: List[str] = Field(default_factory=list)


class ExecutionResult(BaseModel):
    """
    Structured execution result for one action.
    """

    planId: str
    actionId: str
    success: bool
    message: str
    changedTargets: List[str] = Field(default_factory=list)


class RollbackSnapshot(BaseModel):
    """
    Structured rollback payload for one action.
    """

    actionId: str
    target: str
    snapshotKind: str
    snapshotData: Any


class PlanRequest(BaseModel):
    """
    Planner API input:
    - user request
    - workspace snapshot
    """

    userRequest: UserRequest
    workspaceSnapshot: WorkspaceSnapshot


class WorkspaceSnapshotAcceptanceRequest(BaseModel):
    """
    Workspace snapshot acceptance request.

    This is intentionally simple:
    - one collected snapshot
    - timestamp from the extension
    - source marker
    """

    snapshot: WorkspaceSnapshot
    collectedAt: datetime
    source: Literal["vscode-extension"] = "vscode-extension"


class WorkspaceSnapshotAcceptanceSummary(BaseModel):
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


class WorkspaceSnapshotAcceptanceResponse(BaseModel):
    """
    Workspace snapshot acceptance response.
    """

    accepted: bool
    message: str
    summary: WorkspaceSnapshotAcceptanceSummary
    warnings: List[str] = Field(default_factory=list)


class PlanPayload(BaseModel):
    """
    Successful plan payload wrapper.
    """

    kind: Literal["plan"]
    data: ExecutionPlan


class ExplanationPayload(BaseModel):
    """
    Successful explanation payload wrapper.
    """

    kind: Literal["explanation"]
    data: ExplanationResponse


class ErrorPayload(BaseModel):
    """
    Structured error payload wrapper.
    """

    kind: Literal["error"]
    error: Dict[str, str]


PlanResponse = Union[PlanPayload, ExplanationPayload, ErrorPayload]


def validate_execution_plan(payload: dict) -> ExecutionPlan:
    """
    Small helper used by the backend to validate a generated execution plan.
    """
    return ExecutionPlan.model_validate(payload)
