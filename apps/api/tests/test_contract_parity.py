from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.planner.schemas.contracts import (
    ExecutionPlan,
    PlanRequest,
    WorkspaceSnapshotAcceptanceRequest,
)

# Resolve the shared fixtures directory from the API package.
#
# apps/api/tests/test_contract_parity.py
# -> parents[3] should point at the repo root:
#    tests -> api -> apps -> repo-root
REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES_DIR = REPO_ROOT / "contract-fixtures"


def load_fixture(name: str):
    """
    Loads one shared JSON fixture from the repo-level contract-fixtures directory.
    """
    return json.loads((FIXTURES_DIR / name).read_text(encoding="utf-8"))


def test_python_parity_valid_plan_request_is_accepted() -> None:
    payload = load_fixture("valid-plan-request.json")
    parsed = PlanRequest.model_validate(payload)

    assert parsed.userRequest.id == "req-1"


def test_python_parity_invalid_plan_request_is_rejected() -> None:
    payload = load_fixture("invalid-plan-request-created_at.json")

    with pytest.raises(ValidationError):
        PlanRequest.model_validate(payload)


def test_python_parity_valid_execution_plan_is_accepted() -> None:
    payload = load_fixture("valid-execution-plan.json")
    parsed = ExecutionPlan.model_validate(payload)

    assert parsed.id == "plan-1"


def test_python_parity_invalid_execution_plan_is_rejected() -> None:
    payload = load_fixture("invalid-execution-plan-action-type.json")

    try:
        ExecutionPlan.model_validate(payload)
        raise AssertionError("Expected ExecutionPlan validation to fail.")
    except ValidationError:
        pass


def test_python_parity_valid_workspace_snapshot_acceptance_is_accepted() -> None:
    payload = load_fixture("valid-workspace-snapshot-acceptance.json")
    parsed = WorkspaceSnapshotAcceptanceRequest.model_validate(payload)

    assert parsed.source == "vscode-extension"


def test_python_parity_invalid_workspace_snapshot_acceptance_is_rejected() -> None:
    payload = load_fixture("invalid-workspace-snapshot-acceptance.json")

    try:
        WorkspaceSnapshotAcceptanceRequest.model_validate(payload)
        raise AssertionError("Expected WorkspaceSnapshotAcceptanceRequest validation to fail.")
    except ValidationError:
        pass
