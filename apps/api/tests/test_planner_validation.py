import json

from app.planner.classifier import RequestClassifier
from app.planner.policy import PlannerPolicyBuilder
from app.planner.prompts import PlannerPromptBuilder
from app.planner.providers.types import ProviderGenerationResult
from app.planner.schemas import PlanRequest
from app.planner.validation import PlannerResponseValidator


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
            "editor.formatOnSave": False,
        },
        "relevantWorkspaceSettings": {
            "editor.formatOnSave": False,
        },
        "installedTargetExtensions": [
            {
                "id": "esbenp.prettier-vscode",
                "installed": True,
                "version": "10.0.0",
                "isActive": True,
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
                "parsedContent": {"editor.formatOnSave": False},
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
        "notes": ["Validation test fixture."],
    }


def build_request(text: str, hint: str | None = None) -> PlanRequest:
    payload = {
        "userRequest": {
            "id": "req-validation-1",
            "text": text,
            "createdAt": "2026-04-17T12:00:00Z",
        },
        "workspaceSnapshot": build_valid_workspace_snapshot(),
    }

    if hint is not None:
        payload["userRequest"]["requestClassHint"] = hint

    return PlanRequest.model_validate(payload)


def build_prompt_package(payload: PlanRequest):
    classifier = RequestClassifier()
    policy_builder = PlannerPolicyBuilder()
    prompt_builder = PlannerPromptBuilder()

    classification = classifier.classify(payload)
    policy = policy_builder.build(classification.requestClass)

    return prompt_builder.build(
        payload=payload,
        classification=classification,
        policy=policy,
    )


def test_validator_accepts_valid_plan_response_payload() -> None:
    validator = PlannerResponseValidator()
    payload = build_request("Enable format on save for this workspace", "configure")
    prompt_package = build_prompt_package(payload)

    raw_response = {
        "kind": "plan",
        "data": {
            "id": "plan-1",
            "summary": "Enable format on save in this workspace.",
            "explanation": "This will enable editor.formatOnSave for the workspace.",
            "requestClass": "configure",
            "approval": {
                "required": False,
                "reason": "Workspace-only settings update.",
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

    provider_result = ProviderGenerationResult(
        rawText=json.dumps(raw_response),
        providerName="test-provider",
        modelName="test-model",
    )

    result = validator.validate(
        provider_result=provider_result,
        prompt_package=prompt_package,
    )

    assert result.kind == "plan"
    assert result.data.requestClass == "configure"
    assert result.data.actions[0].actionType == "updateWorkspaceSettings"


def test_validator_rejects_current_gemini_style_array_output() -> None:
    validator = PlannerResponseValidator()
    payload = build_request("Enable format on save for this workspace", "configure")
    prompt_package = build_prompt_package(payload)

    provider_result = ProviderGenerationResult(
        rawText="""```json
[
  {
    "actionType": "patchVscodeSettingsJson",
    "description": "Enable format on save for the current workspace.",
    "filePath": ".vscode/settings.json",
    "patch": {
      "editor.formatOnSave": true
    },
    "requiresApproval": true,
    "riskLevel": "medium"
  }
]
```""",
        providerName="google_agentic",
        modelName="gemini-2.5-flash-lite",
        responseId="resp-1",
    )

    result = validator.validate(
        provider_result=provider_result,
        prompt_package=prompt_package,
    )

    assert result.kind == "error"
    assert result.error.code == "invalid_plan_payload"
    assert result.error.details is not None
    assert result.error.details["provider"] == "google_agentic"
