import pytest

from app.planner.classifier import RequestClassifier
from app.planner.schemas import PlanRequest


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


@pytest.mark.parametrize(
    ("text", "expected_class"),
    [
        ("Explain my current VS Code setup", "explain"),
        ("Inspect this workspace configuration", "inspect"),
        ("Enable format on save for this workspace", "configure"),
        ("Fix my Prettier setup", "repair"),
        (
            "Should this go in user settings or workspace settings?",
            "guide",
        ),
    ],
)
def test_request_classifier_resolves_expected_class_from_text(
    text: str,
    expected_class: str,
) -> None:
    classifier = RequestClassifier()

    result = classifier.classify(build_request(text))

    assert result.isSupported is True
    assert result.requestClass == expected_class


def test_request_classifier_overrides_conflicting_hint_when_text_is_strong() -> None:
    classifier = RequestClassifier()

    result = classifier.classify(
        build_request(
            text="Enable format on save for this workspace",
            hint="explain",
        )
    )

    assert result.isSupported is True
    assert result.requestClass == "configure"
    assert result.source == "rule"
    assert any("Overrode requestClassHint" in warning for warning in result.warnings)


def test_request_classifier_keeps_soft_explain_inspect_hint() -> None:
    classifier = RequestClassifier()

    result = classifier.classify(
        build_request(
            text="Show my current setup",
            hint="explain",
        )
    )

    assert result.isSupported is True
    assert result.requestClass == "explain"
    assert result.source == "hint"


def test_request_classifier_rejects_obviously_unsupported_request() -> None:
    classifier = RequestClassifier()

    result = classifier.classify(build_request("Run shell commands to install dependencies"))

    assert result.isSupported is False
    assert result.unsupportedReason is not None
