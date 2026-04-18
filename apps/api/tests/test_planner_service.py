import json

from app.planner.providers.types import ProviderGenerationResult
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
        "notes": ["Service validation test fixture."],
    }


def build_request(text: str, hint: str | None = None) -> PlanRequest:
    payload = {
        "userRequest": {
            "id": "req-service-1",
            "text": text,
            "createdAt": "2026-04-17T12:00:00Z",
        },
        "workspaceSnapshot": build_valid_workspace_snapshot(),
    }

    if hint is not None:
        payload["userRequest"]["requestClassHint"] = hint

    return PlanRequest.model_validate(payload)


class StaticInvalidProvider:
    name = "static-invalid"

    def generate(self, payload, classification, policy, prompt_package):
        return ProviderGenerationResult(
            rawText="""```json
[
  {
    "actionType": "patchVscodeSettingsJson",
    "patch": {
      "editor.formatOnSave": true
    }
  }
]
```""",
            providerName=self.name,
            modelName="fake-model",
        )


class StaticValidExplanationProvider:
    name = "static-valid-explanation"

    def generate(self, payload, classification, policy, prompt_package):
        # Model-facing explanation object only.
        raw_response = {
            "id": "explain-1",
            "requestClass": "explain",
            "title": "Current VS Code setup overview",
            "explanation": "Your workspace contains a .vscode/settings.json file and relevant formatter signals.",
            "suggestedNextSteps": [
                "Review workspace settings.",
                "Confirm the formatter extension is active.",
            ],
        }

        return ProviderGenerationResult(
            rawText=json.dumps(raw_response),
            parsedJson=raw_response,
            providerName=self.name,
            modelName="fake-model",
        )


class StaticValidDraftPlanProvider:
    name = "static-valid-plan"

    def generate(self, payload, classification, policy, prompt_package):
        # Model-facing draft plan object only.
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

        return ProviderGenerationResult(
            rawText=json.dumps(raw_response),
            parsedJson=raw_response,
            providerName=self.name,
            modelName="fake-model",
        )


def test_planner_service_returns_real_explanation_when_provider_output_is_valid() -> None:
    provider = StaticValidExplanationProvider()
    service = PlannerService(provider=provider)

    response = service.generate(build_request("Explain my current VS Code setup", hint="explain"))

    assert response.kind == "explanation"
    assert response.data.requestClass == "explain"
    assert response.data.title == "Current VS Code setup overview"


def test_planner_service_returns_invalid_plan_payload_for_wrong_shape_output() -> None:
    provider = StaticInvalidProvider()
    service = PlannerService(provider=provider)

    response = service.generate(build_request("Enable format on save for this workspace", hint="configure"))

    assert response.kind == "error"
    assert response.error.code == "invalid_plan_payload"
    assert response.error.details is not None
    assert response.error.details["provider"] == "static-invalid"


def test_planner_service_returns_real_plan_when_provider_output_is_valid() -> None:
    provider = StaticValidDraftPlanProvider()
    service = PlannerService(provider=provider)

    response = service.generate(build_request("Enable format on save for this workspace", hint="configure"))

    assert response.kind == "plan"
    assert response.data.requestClass == "configure"
    assert response.data.actions[0].actionType == "updateWorkspaceSettings"
    assert response.data.actions[0].requiresApproval is False
