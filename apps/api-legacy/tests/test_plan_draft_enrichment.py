from app.planner.draft_schemas import DraftExecutionPlan
from app.planner.enrichment import PlanDraftEnricher
from app.planner.policy import PlannerPolicyBuilder
from app.planner.schemas import WorkspaceSnapshot


def build_workspace_snapshot() -> WorkspaceSnapshot:
    return WorkspaceSnapshot.model_validate(
        {
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
            "relevantUserSettings": {},
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
    )


def test_plan_draft_enricher_fills_backend_metadata() -> None:
    draft = DraftExecutionPlan.model_validate(
        {
            "id": "plan-1",
            "summary": "Enable format on save for this workspace",
            "explanation": "Turn on editor.formatOnSave at workspace scope.",
            "requestClass": "configure",
            "actions": [
                {
                    "id": "action-1",
                    "actionType": "updateWorkspaceSettings",
                    "scope": "workspace",
                    "target": "editor.formatOnSave",
                    "parameters": {
                        "settings": {
                            "editor.formatOnSave": True,
                        }
                    },
                    "riskLevel": "low",
                }
            ],
        }
    )

    policy = PlannerPolicyBuilder().build("configure")
    workspace_snapshot = build_workspace_snapshot()

    enriched = PlanDraftEnricher().enrich(
        draft=draft,
        policy=policy,
        workspace_snapshot=workspace_snapshot,
    )

    assert enriched.kind == "plan"
    assert enriched.data.approval.required is False
    assert enriched.data.actions[0].requiresApproval is False
    assert enriched.data.actions[0].executionMethod == "vscodeConfigurationUpdate:workspace"
    assert enriched.data.actions[0].rollbackMethod == "restorePreviousSettingValue:workspace"
    assert enriched.data.actions[0].preview.before is False
    assert enriched.data.actions[0].preview.after is True
