from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


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


def build_valid_plan_request() -> dict:
    return {
        "userRequest": {
            "id": "req-1",
            "text": "Explain my current VS Code setup",
            "requestClassHint": "explain",
            "createdAt": "2026-04-10T12:00:00Z",
        },
        "workspaceSnapshot": build_valid_workspace_snapshot(),
    }


def test_plan_route_accepts_valid_payload_and_returns_structured_response() -> None:
    response = client.post("/plan", json=build_valid_plan_request())

    assert response.status_code == 200

    body = response.json()
    assert body["kind"] in {"plan", "explanation", "error"}

    if body["kind"] == "plan":
        assert "data" in body
        assert body["data"]["requestClass"] in {"configure", "repair", "guide"}

    elif body["kind"] == "explanation":
        assert "data" in body
        assert body["data"]["requestClass"] in {"explain", "inspect", "guide"}
        assert isinstance(body["data"]["title"], str)
        assert isinstance(body["data"]["explanation"], str)

    else:
        assert "error" in body
        assert isinstance(body["error"]["code"], str)
        assert isinstance(body["error"]["message"], str)


def test_plan_route_rejects_old_created_at_field_at_request_boundary() -> None:
    payload = build_valid_plan_request()
    payload["userRequest"].pop("createdAt")
    payload["userRequest"]["created_at"] = "2026-04-10T12:00:00Z"

    response = client.post("/plan", json=payload)

    assert response.status_code == 422


def test_plan_route_rejects_invalid_workspace_snapshot_shape_at_request_boundary() -> None:
    payload = build_valid_plan_request()
    payload["workspaceSnapshot"]["workspaceFolders"] = "not-an-array"

    response = client.post("/plan", json=payload)

    assert response.status_code == 422


def test_plan_route_rejects_unknown_top_level_fields_at_request_boundary() -> None:
    response = client.post(
        "/plan",
        json={
            "userRequest": {
                "id": "req-1",
                "text": "Explain my current VS Code setup",
            },
            "workspaceSnapshot": build_valid_workspace_snapshot(),
            "unexpectedTopLevelField": True,
        },
    )

    assert response.status_code == 422
