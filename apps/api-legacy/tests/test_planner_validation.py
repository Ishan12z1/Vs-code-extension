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


def build_context(payload: PlanRequest):
    classifier = RequestClassifier()
    policy_builder = PlannerPolicyBuilder()
    prompt_builder = PlannerPromptBuilder()

    classification = classifier.classify(payload)
    policy = policy_builder.build(classification.requestClass)
    prompt_package = prompt_builder.build(
        payload=payload,
        classification=classification,
        policy=policy,
    )
    return classification, policy, prompt_package


def test_validator_accepts_valid_draft_plan_and_returns_enriched_shared_plan() -> None:
    validator = PlannerResponseValidator()
    payload = build_request("Enable format on save for this workspace", "configure")
    _, policy, prompt_package = build_context(payload)

    # Draft object only. No top-level kind/data wrapper.
    raw_response = {
        "id": "plan-1",
        "summary": "Enable format on save in this workspace.",
        "explanation": "This will enable editor.formatOnSave for the workspace.",
        "requestClass": "configure",
        "actions": [
            {
                "id": "action-1",
                "actionType": "updateWorkspaceSettings",
                "scope": "workspace",
                "target": "editor.formatOnSave",
                "parameters": {
                    "value": True,
                },
                "riskLevel": "low",
            }
        ],
    }

    provider_result = ProviderGenerationResult(
        rawText=json.dumps(raw_response),
        parsedJson=raw_response,
        providerName="test-provider",
        modelName="test-model",
    )

    result = validator.validate(
        provider_result=provider_result,
        prompt_package=prompt_package,
        policy=policy,
        workspace_snapshot=payload.workspaceSnapshot,
    )

    assert result.kind == "plan"
    assert result.data.requestClass == "configure"
    assert result.data.actions[0].actionType == "updateWorkspaceSettings"
    assert result.data.actions[0].requiresApproval is False
    assert result.data.actions[0].executionMethod == "vscodeConfigurationUpdate:workspace"
    assert result.data.actions[0].rollbackMethod == "restorePreviousSettingValue:workspace"


def test_validator_rejects_current_gemini_style_array_output() -> None:
    validator = PlannerResponseValidator()
    payload = build_request("Enable format on save for this workspace", "configure")
    _, policy, prompt_package = build_context(payload)

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
        policy=policy,
        workspace_snapshot=payload.workspaceSnapshot,
    )

    assert result.kind == "error"
    assert result.error.code == "invalid_plan_payload"
    assert result.error.details is not None
    assert result.error.details["provider"] == "google_agentic"
