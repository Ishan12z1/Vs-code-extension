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
        "installedTargetExtensions": [],
        "keybindingSignals": [],
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
                "exists": False,
                "parseStatus": "not_found",
                "parsedContent": None,
                "parseError": None,
            },
        },
        "notes": [],
    }


def build_request(text: str, hint: str | None = None) -> PlanRequest:
    payload = {
        "userRequest": {
            "id": "req-retry-1",
            "text": text,
            "createdAt": "2026-04-17T12:00:00Z",
        },
        "workspaceSnapshot": build_valid_workspace_snapshot(),
    }

    if hint is not None:
        payload["userRequest"]["requestClassHint"] = hint

    return PlanRequest.model_validate(payload)


class RetrySucceedsProvider:
    name = "retry-succeeds"

    def __init__(self) -> None:
        self.calls = 0

    def generate(self, payload, classification, policy, prompt_package):
        self.calls += 1

        if self.calls == 1:
            return ProviderGenerationResult(
                rawText="""```json
{"plan":[{"actionType":"patchVscodeSettingsJson"}]}
```""",
                providerName=self.name,
                modelName="fake-model",
            )

        # Corrected retry output is the draft object only.
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


def test_planner_service_retries_once_and_accepts_corrected_output() -> None:
    provider = RetrySucceedsProvider()
    service = PlannerService(provider=provider)

    response = service.generate(build_request("Enable format on save for this workspace", hint="configure"))

    assert provider.calls == 2
    assert response.kind == "plan"
    assert response.data.requestClass == "configure"
    assert response.data.actions[0].requiresApproval is False
