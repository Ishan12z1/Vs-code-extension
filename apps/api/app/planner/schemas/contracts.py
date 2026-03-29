from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Union

from pydantic import BaseModel, Field


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
    id: str
    text: str
    requestClassHint: RequestClass | None = None
    createdAt: datetime | None = None


class WorkspaceFolder(BaseModel):
    name: str
    uri: str


class InstalledTargetExtension(BaseModel):
    id: str
    installed: bool
    version: str | None = None
    isActive: bool = False


class KeybindingSignal(BaseModel):
    command: str
    available: bool
    keybinding: str | None = None
    note: str | None = None


class WorkspaceSnapshot(BaseModel):
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
    notes: List[str] = Field(default_factory=list)


class ApprovalRequirement(BaseModel):
    required: bool
    reason: str
    riskLevel: RiskLevel


class ActionPreview(BaseModel):
    summary: str
    targetLabel: str
    before: Any | None = None
    after: Any | None = None
    diffText: str | None = None


class PlannedAction(BaseModel):
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
    id: str
    summary: str
    explanation: str
    requestClass: Literal["configure", "repair", "guide"]
    approval: ApprovalRequirement
    actions: List[PlannedAction]


class ExplanationResponse(BaseModel):
    id: str
    requestClass: Literal["explain", "inspect", "guide"]
    title: str
    explanation: str
    suggestedNextSteps: List[str] = Field(default_factory=list)


class ExecutionResult(BaseModel):
    planId: str
    actionId: str
    success: bool
    message: str
    changedTargets: List[str] = Field(default_factory=list)


class RollbackSnapshot(BaseModel):
    actionId: str
    target: str
    snapshotKind: str
    snapshotData: Any


class PlanRequest(BaseModel):
    userRequest: UserRequest
    workspaceSnapshot: WorkspaceSnapshot


class PlanPayload(BaseModel):
    kind: Literal["plan"]
    data: ExecutionPlan


class ExplanationPayload(BaseModel):
    kind: Literal["explanation"]
    data: ExplanationResponse


class ErrorPayload(BaseModel):
    kind: Literal["error"]
    error: Dict[str, str]


PlanResponse = Union[PlanPayload, ExplanationPayload, ErrorPayload]


def validate_execution_plan(payload: dict) -> ExecutionPlan:
    return ExecutionPlan.model_validate(payload)