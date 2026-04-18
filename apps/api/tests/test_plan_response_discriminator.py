from pydantic import ValidationError

from app.planner.schemas import validate_plan_response


def test_validate_plan_response_routes_to_plan_branch_by_kind() -> None:
    payload = {
        "kind": "plan",
        "data": {
            "id": "plan-1",
            "summary": "Enable format on save.",
            "explanation": "This will enable format on save.",
            "requestClass": "configure",
            "approval": {
                "required": False,
                "reason": "Low-risk workspace settings update.",
                "riskLevel": "low",
            },
            "actions": [
                {
                    "id": "action-1",
                    "actionType": "updateWorkspaceSettings",
                    "scope": "workspace",
                    "target": "editor.formatOnSave",
                    "parameters": {
                        "key": "editor.formatOnSave",
                        "value": True,
                    },
                    "riskLevel": "low",
                    "requiresApproval": False,
                    "preview": {
                        "summary": "Enable format on save.",
                        "targetLabel": "workspace setting editor.formatOnSave",
                        "before": False,
                        "after": True,
                    },
                    "executionMethod": "vscode.workspace.getConfiguration().update",
                    "rollbackMethod": "restorePreviousValue",
                }
            ],
        },
    }

    result = validate_plan_response(payload)

    assert result.kind == "plan"
    assert result.data.requestClass == "configure"


def test_validate_plan_response_reports_plan_branch_errors_for_plan_kind() -> None:
    payload = {
        "kind": "plan",
        "data": {
            "id": "plan-1",
            "summary": "Enable format on save.",
            "explanation": "This will enable format on save.",
            "requestClass": "configure",
            "approval": {
                "required": False,
                "reason": "Low-risk workspace settings update.",
                "riskLevel": "low",
            },
            "actions": [
                {
                    "id": "action-1",
                    "actionType": "updateWorkspaceSettings",
                    "scope": "workspace",
                    "target": "editor.formatOnSave",
                    "parameters": {
                        "key": "editor.formatOnSave",
                        "value": True,
                    },
                    "riskLevel": "low",
                    # Missing nested fields on purpose:
                    # requiresApproval, preview, executionMethod, rollbackMethod
                }
            ],
        },
    }

    try:
        validate_plan_response(payload)
        raise AssertionError("Expected plan response validation to fail.")
    except ValidationError as exc:
        errors = exc.errors()
        locations = [tuple(error["loc"]) for error in errors]

        assert ("plan", "data", "actions", 0, "requiresApproval") in locations
        assert ("plan", "data", "actions", 0, "preview") in locations
        assert ("plan", "data", "actions", 0, "executionMethod") in locations
        assert ("plan", "data", "actions", 0, "rollbackMethod") in locations

        # The whole point of the discriminated union is that we should NOT now see
        # irrelevant ExplanationPayload / ErrorPayload branch noise.
        assert not any("ExplanationPayload" in str(location) for location in locations)
        assert not any("ErrorPayload" in str(location) for location in locations)
