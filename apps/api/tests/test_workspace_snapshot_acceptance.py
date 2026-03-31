from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _build_valid_snapshot_payload() -> dict:
    """
    Minimal valid Step 5 snapshot payload.
    Keep it realistic, but small.
    """
    return {
        "snapshot": {
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
            "relevantUserSettings": {"editor.formatOnSave": True},
            "relevantWorkspaceSettings": {"prettier.requireConfig": True},
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
        },
        "collectedAt": "2026-03-30T12:00:00Z",
        "source": "vscode-extension",
    }


def test_workspace_snapshot_acceptance_success() -> None:
    response = client.post(
        "/workspace-snapshots/accept",
        json=_build_valid_snapshot_payload(),
    )

    assert response.status_code == 200

    body = response.json()
    assert body["accepted"] is True
    assert body["message"] == "Workspace snapshot accepted and validated."
    assert body["summary"]["workspaceFolderCount"] == 1
    assert body["summary"]["detectedMarkerCount"] == 2
    assert body["summary"]["parsedVscodeFileCount"] == 2
    assert body["summary"]["invalidVscodeFileCount"] == 0


def test_workspace_snapshot_acceptance_rejects_invalid_payload() -> None:
    response = client.post(
        "/workspace-snapshots/accept",
        json={
            # snapshot is intentionally malformed here
            "snapshot": {"workspaceFolders": "not-an-array"},
            "collectedAt": "2026-03-30T12:00:00Z",
            "source": "vscode-extension",
        },
    )

    assert response.status_code == 422
