from app.planner.providers.mock import MockPlannerProvider
from app.planner.schemas import PlanRequest
from app.planner.service import PlannerService


def build_valid_workspace_snapshot() -> dict:
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
                "parsedContent": {"editor.formatOnSave": True},
                "parseError": None,
            },
            "tasksJson": {
                "relativePath": ".vscode/tasks.json",
                "exists": False,
                "parseStatus": "not_found",
                "parsedContent": None,
                "parseError": None,
            },
            "launchJson": {
                "relativePath": ".vscode/launch.json",
                "exists": False,
                "parseStatus": "not_found",
                "parsedContent": None,
                "parseError": None,
            },
            "extensionsJson": {
                "relativePath": ".vscode/extensions.json",
                "exists": True,
                "parseStatus": "parsed",
                "parsedContent": {
                    "recommendations": ["esbenp.prettier-vscode"],
                },
                "parseError": None,
            },
        },
        "notes": ["Detected likely JS/TS workspace signals."],
    }


def build_request(text: str, hint: str | None = None) -> PlanRequest:
    payload = {
        "userRequest": {
            "id": "req-1",
            "text": text,
            "createdAt": "2026-04-10T12:00:00Z",
        },
        "workspaceSnapshot": build_valid_workspace_snapshot(),
    }

    if hint is not None:
        payload["userRequest"]["requestClassHint"] = hint

    return PlanRequest.model_validate(payload)


def test_planner_service_passes_resolved_request_class_and_policy_to_provider() -> None:
    provider = MockPlannerProvider()
    service = PlannerService(provider=provider)

    response = service.generate(
        build_request("Enable format on save for this workspace", hint="configure")
    )

    assert response.kind == "error"
    assert response.error.code == "not_implemented"
    assert response.error.details is not None
    assert response.error.details["provider"] == "mock"
    assert response.error.details["resolvedRequestClass"] == "configure"
    assert response.error.details["supportsPlanning"] is True
    assert "updateWorkspaceSettings" in response.error.details["allowedActionTypes"]


def test_planner_service_rejects_unsupported_requests_before_policy_and_provider() -> None:
    provider = MockPlannerProvider()
    service = PlannerService(provider=provider)

    response = service.generate(build_request("Run shell commands to install dependencies"))

    assert response.kind == "error"
    assert response.error.code == "unsupported_request"
    assert response.error.details is not None
    assert response.error.details["resolvedRequestClass"] == "guide"
