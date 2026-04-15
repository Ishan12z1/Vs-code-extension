from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.planner.schemas.contracts import (
    ApprovalDecisionRequest,
    ExecutionPlan,
    PlanPayload,
    PlanRequest,
    WorkspaceSnapshotAcceptanceRequest,
)


def build_valid_workspace_snapshot() -> dict:
    """
    Shared minimal valid workspace snapshot fixture for Python-side contract tests.

    Keep this payload realistic, but small enough to reuse across many tests.
    """
    return {
        "workspaceFolders": [
            {
                "name": "demo-workspace",
                "uri": "file:///demo-workspace",
            }
        ],
        "hasWorkspaceFile": False,
        "vscodeFolderPresent": True,
        "detectedMarkers": ["marker:package.json", "stack:jsts"],
        "installedExtensions": [],
        "relevantFiles": ["package.json", ".vscode/settings.json"],
        "relevantUserSettings": {
            "editor.formatOnSave": True,
        },
        "relevantWorkspaceSettings": {
            "prettier.requireConfig": True,
        },
        "installedTargetExtensions": [
            {
                "id": "esbenp.prettier-vscode",
                "installed": True,
                "version": "10.0.0",
                "isActive": False,
            }
        ],
        "keybindingSignals": [
            {
                "command": "editor.action.formatDocument",
                "available": True,
                "keybinding": None,
                "note": "Formatting command exists.",
            }
        ],
        "vscodeFiles": {
            "settingsJson": {
                "relativePath": ".vscode/settings.json",
                "exists": True,
                "parseStatus": "parsed",
                "json": {"editor.formatOnSave": True},
                "parseError": None,
            },
            "tasksJson": {
                "relativePath": ".vscode/tasks.json",
                "exists": False,
                "parseStatus": "not_found",
                "json": None,
                "parseError": None,
            },
            "launchJson": {
                "relativePath": ".vscode/launch.json",
                "exists": False,
                "parseStatus": "not_found",
                "json": None,
                "parseError": None,
            },
            "extensionsJson": {
                "relativePath": ".vscode/extensions.json",
                "exists": True,
                "parseStatus": "parsed",
                "json": {"recommendations": ["esbenp.prettier-vscode"]},
                "parseError": None,
            },
        },
        "notes": ["Detected likely JS/TS workspace signals."],
    }


def build_valid_planned_action() -> dict:
    """
    Shared minimal valid planned action fixture.
    """
    return {
        "id": "action-1",
        "actionType": "updateWorkspaceSettings",
        "scope": "workspace",
        "target": "editor.formatOnSave",
        "parameters": {"value": True},
        "riskLevel": "low",
        "requiresApproval": False,
        "preview": {
            "summary": "Enable format on save for this workspace.",
            "targetLabel": "editor.formatOnSave",
            "before": False,
            "after": True,
            "diffText": "editor.formatOnSave: false -> true",
        },
        "executionMethod": "vscode.workspace.getConfiguration().update",
        "rollbackMethod": "restore_previous_setting",
    }


def test_plan_request_accepts_valid_payload() -> None:
    """
    Valid PlanRequest payload should be accepted by the Python mirror.
    """
    payload = {
        "userRequest": {
            "id": "req-1",
            "text": "Explain my current VS Code setup",
            "requestClassHint": "explain",
            "createdAt": "2026-04-10T12:00:00Z",
        },
        "workspaceSnapshot": build_valid_workspace_snapshot(),
    }

    parsed = PlanRequest.model_validate(payload)

    assert parsed.userRequest.id == "req-1"
    assert parsed.userRequest.requestClassHint == "explain"
    assert len(parsed.workspaceSnapshot.workspaceFolders) == 1


def test_plan_request_rejects_old_created_at_field() -> None:
    """
    The old drifted field name created_at should now be rejected.

    This is one of the most important D1/D4 regression checks.
    """
    payload = {
        "userRequest": {
            "id": "req-1",
            "text": "Explain my current VS Code setup",
            "created_at": "2026-04-10T12:00:00Z",
        },
        "workspaceSnapshot": build_valid_workspace_snapshot(),
    }

    with pytest.raises(ValidationError):
        PlanRequest.model_validate(payload)


def test_execution_plan_accepts_valid_payload() -> None:
    """
    Valid ExecutionPlan payload should be accepted.
    """
    payload = {
        "id": "plan-1",
        "summary": "Enable format on save in the workspace",
        "explanation": "This updates workspace settings only.",
        "requestClass": "configure",
        "approval": {
            "required": False,
            "reason": "Low-risk workspace setting update.",
            "riskLevel": "low",
        },
        "actions": [build_valid_planned_action()],
    }

    parsed = ExecutionPlan.model_validate(payload)

    assert parsed.id == "plan-1"
    assert len(parsed.actions) == 1
    assert parsed.actions[0].actionType == "updateWorkspaceSettings"


def test_execution_plan_rejects_invalid_action_type() -> None:
    """
    Invalid actionType should fail validation in the Python mirror.
    """
    payload = {
        "id": "plan-1",
        "summary": "Bad action type test",
        "explanation": "This should fail.",
        "requestClass": "configure",
        "approval": {
            "required": False,
            "reason": "Testing invalid contract payload.",
            "riskLevel": "low",
        },
        "actions": [
            {
                **build_valid_planned_action(),
                "actionType": "deleteEverything",
            }
        ],
    }

    try:
        ExecutionPlan.model_validate(payload)
        raise AssertionError("Expected ExecutionPlan validation to fail.")
    except ValidationError:
        pass


def test_execution_plan_rejects_invalid_scope() -> None:
    """
    Invalid scope should fail validation in the Python mirror.
    """
    payload = {
        "id": "plan-1",
        "summary": "Bad scope test",
        "explanation": "This should fail.",
        "requestClass": "configure",
        "approval": {
            "required": False,
            "reason": "Testing invalid contract payload.",
            "riskLevel": "low",
        },
        "actions": [
            {
                **build_valid_planned_action(),
                "scope": "global",
            }
        ],
    }

    try:
        ExecutionPlan.model_validate(payload)
        raise AssertionError("Expected ExecutionPlan validation to fail.")
    except ValidationError:
        pass


def test_workspace_snapshot_acceptance_request_accepts_valid_payload() -> None:
    """
    Valid workspace snapshot acceptance request should be accepted.
    """
    payload = {
        "snapshot": build_valid_workspace_snapshot(),
        "collectedAt": "2026-04-10T12:00:00Z",
        "source": "vscode-extension",
    }

    parsed = WorkspaceSnapshotAcceptanceRequest.model_validate(payload)

    assert parsed.source == "vscode-extension"
    assert len(parsed.snapshot.detectedMarkers) == 2


def test_workspace_snapshot_acceptance_request_rejects_invalid_snapshot_shape() -> None:
    """
    Malformed snapshot shape should fail validation.
    """
    payload = {
        "snapshot": {
            "workspaceFolders": "not-an-array",
        },
        "collectedAt": "2026-04-10T12:00:00Z",
        "source": "vscode-extension",
    }

    try:
        WorkspaceSnapshotAcceptanceRequest.model_validate(payload)
        raise AssertionError("Expected WorkspaceSnapshotAcceptanceRequest validation to fail.")
    except ValidationError:
        pass


def test_approval_decision_request_accepts_valid_payload() -> None:
    """
    Valid approval decision request should be accepted.
    """
    payload = {
        "runId": "run-1",
        "planId": "plan-1",
        "decision": "approved",
        "reason": "Looks safe to apply.",
    }

    parsed = ApprovalDecisionRequest.model_validate(payload)

    assert parsed.decision == "approved"
    assert parsed.reason == "Looks safe to apply."


def test_plan_payload_accepts_valid_plan_wrapper() -> None:
    """
    Valid wrapped plan payload should be accepted.
    """
    payload = {
        "kind": "plan",
        "data": {
            "id": "plan-1",
            "summary": "Enable format on save in the workspace",
            "explanation": "This updates workspace settings only.",
            "requestClass": "configure",
            "approval": {
                "required": False,
                "reason": "Low-risk workspace setting update.",
                "riskLevel": "low",
            },
            "actions": [build_valid_planned_action()],
        },
    }

    parsed = PlanPayload.model_validate(payload)

    assert parsed.kind == "plan"
    assert parsed.data.id == "plan-1"
