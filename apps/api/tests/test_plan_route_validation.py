from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def build_valid_workspace_snapshot() -> dict:
    """
    Shared minimal valid workspace snapshot fixture for real route tests.

    Keep this aligned with the shared contracts:
    - createdAt for user request timestamps
    - parsedContent for .vscode/* inspection payloads
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
    """
    Shared valid /plan payload.

    This is the positive control for the route:
    the payload should pass boundary validation and reach the handler.
    """
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
    """
    Valid payload should pass request-boundary validation.

    This test is about the real API boundary, not about forcing one older
    placeholder planner behavior. Once planner wiring exists, a valid request may
    return:
    - explanation
    - plan
    - structured error
    """
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
    """
    Drifted field names should now fail at the real API boundary.

    This is one of the key D6 checks: invalid shared payloads must be rejected
    by the route input model, not accepted and handled later.
    """
    payload = build_valid_plan_request()
    payload["userRequest"].pop("createdAt")
    payload["userRequest"]["created_at"] = "2026-04-10T12:00:00Z"

    response = client.post("/plan", json=payload)

    assert response.status_code == 422


def test_plan_route_rejects_invalid_workspace_snapshot_shape_at_request_boundary() -> None:
    """
    Malformed workspace snapshot payloads should fail before handler logic runs.
    """
    payload = build_valid_plan_request()
    payload["workspaceSnapshot"]["workspaceFolders"] = "not-an-array"

    response = client.post("/plan", json=payload)

    assert response.status_code == 422


def test_plan_route_rejects_invalid_action_payload_shape_when_used_later() -> None:
    """
    This test keeps D6 honest about route-boundary validation only.

    /plan currently accepts a PlanRequest, not a full plan body, so this test
    verifies that boundary validation still stays scoped to the request contract.
    """
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

    # Because the shared contract models are strict, unknown top-level fields
    # must also be rejected.
    assert response.status_code == 422
