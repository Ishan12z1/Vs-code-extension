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


def build_valid_plan_request_model() -> PlanRequest:
    return PlanRequest.model_validate(
        {
            "userRequest": {
                "id": "req-1",
                "text": "Explain my current VS Code setup",
                "requestClassHint": "explain",
                "createdAt": "2026-04-10T12:00:00Z",
            },
            "workspaceSnapshot": build_valid_workspace_snapshot(),
        }
    )


def test_planner_service_delegates_to_provider_and_returns_structured_response() -> None:
    provider = MockPlannerProvider()
    service = PlannerService(provider=provider)

    response = service.generate(build_valid_plan_request_model())

    assert response.kind == "error"
    assert response.error.code == "not_implemented"
    assert response.error.details is not None
    assert response.error.details["provider"] == "mock"
    assert response.error.details["requestId"] == "req-1"
