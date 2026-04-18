from app.planner.classifier import RequestClassifier
from app.planner.policy import PlannerPolicyBuilder
from app.planner.prompts import PlannerPromptBuilder
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


def test_prompt_builder_uses_explanation_mode_for_explain_request() -> None:
    classifier = RequestClassifier()
    policy_builder = PlannerPolicyBuilder()
    prompt_builder = PlannerPromptBuilder()

    payload = build_request("Explain my current VS Code setup", "explain")
    classification = classifier.classify(payload)
    policy = policy_builder.build(classification.requestClass)

    prompt_package = prompt_builder.build(
        payload=payload,
        classification=classification,
        policy=policy,
    )

    assert prompt_package.mode == "explanation"
    assert prompt_package.requestClass == "explain"
    assert len(prompt_package.messages) == 2
    assert "structured JSON only" in prompt_package.messages[0].content
    assert '"task": "Explain the user' in prompt_package.messages[1].content
    assert '"policyRules"' in prompt_package.messages[1].content


def test_prompt_builder_uses_plan_mode_for_configure_request() -> None:
    classifier = RequestClassifier()
    policy_builder = PlannerPolicyBuilder()
    prompt_builder = PlannerPromptBuilder()

    payload = build_request(
        "Enable format on save for this workspace",
        "configure",
    )
    classification = classifier.classify(payload)
    policy = policy_builder.build(classification.requestClass)

    prompt_package = prompt_builder.build(
        payload=payload,
        classification=classification,
        policy=policy,
    )

    assert prompt_package.mode == "plan"
    assert prompt_package.requestClass == "configure"
    assert len(prompt_package.messages) == 2
    assert "structured JSON only" in prompt_package.messages[0].content
    assert '"allowedActions"' in prompt_package.messages[1].content
    assert '"updateWorkspaceSettings"' in prompt_package.messages[1].content
