from __future__ import annotations

from fastapi.testclient import TestClient

from app.db.session import get_db_session
from app.dependencies.planner import get_planner_service
from app.main import app
from app.planner.result import PlannerRunRecord
from app.planner.schemas import ExplanationPayload

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
        "installedTargetExtensions": [],
        "keybindingSignals": [],
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
                "exists": False,
                "parseStatus": "not_found",
                "parsedContent": None,
                "parseError": None,
            },
        },
        "notes": [],
    }


def build_valid_plan_request() -> dict:
    return {
        "userRequest": {
            "id": "req-route-1",
            "text": "Explain my current VS Code setup",
            "requestClassHint": "explain",
            "createdAt": "2026-04-10T12:00:00Z",
        },
        "workspaceSnapshot": build_valid_workspace_snapshot(),
    }


class DummySession:
    def __init__(self) -> None:
        self.rollback_called = False

    def rollback(self) -> None:
        self.rollback_called = True


class FakePlannerService:
    def generate_record(self, payload):
        return PlannerRunRecord(
            response=ExplanationPayload(
                kind="explanation",
                data={
                    "id": "exp-1",
                    "requestClass": "explain",
                    "title": "Current VS Code setup overview",
                    "explanation": "Your workspace contains VS Code settings and formatter signals.",
                    "suggestedNextSteps": ["Review workspace settings."],
                },
            ),
            resolved_request_class="explain",
            classification_source="hint",
            classification_reason="Accepted explain hint.",
            classification_warnings=[],
            prompt_mode="explanation",
            supports_planning=False,
            provider_name="fake-provider",
            provider_model="fake-model",
            provider_response_id="fake-response-id",
            provider_finish_reason="STOP",
            raw_text_preview='{"id":"exp-1"}',
            retry_attempted=False,
            run_status="completed_explanation",
        )


def test_plan_route_uses_service_and_persistence(monkeypatch) -> None:
    persisted = {"called": False}
    dummy_session = DummySession()

    def fake_persist_planner_run(*, session, payload, record):
        persisted["called"] = True
        assert session is dummy_session

    app.dependency_overrides[get_planner_service] = lambda: FakePlannerService()
    app.dependency_overrides[get_db_session] = lambda: dummy_session

    import app.routes.plan as plan_route_module

    monkeypatch.setattr(
        plan_route_module,
        "persist_planner_run",
        fake_persist_planner_run,
    )

    try:
        response = client.post("/plan", json=build_valid_plan_request())

        assert response.status_code == 200
        body = response.json()
        assert body["kind"] == "explanation"
        assert body["data"]["requestClass"] == "explain"
        assert persisted["called"] is True
    finally:
        app.dependency_overrides.clear()


def test_plan_route_returns_internal_error_when_persistence_fails(monkeypatch) -> None:
    dummy_session = DummySession()

    def failing_persist_planner_run(*, session, payload, record):
        assert session is dummy_session
        raise RuntimeError("db write failed")

    app.dependency_overrides[get_planner_service] = lambda: FakePlannerService()
    app.dependency_overrides[get_db_session] = lambda: dummy_session

    import app.routes.plan as plan_route_module

    monkeypatch.setattr(
        plan_route_module,
        "persist_planner_run",
        failing_persist_planner_run,
    )

    try:
        response = client.post("/plan", json=build_valid_plan_request())

        assert response.status_code == 200
        body = response.json()
        assert body["kind"] == "error"
        assert body["error"]["code"] == "internal_error"
        assert "could not be persisted" in body["error"]["message"]
        assert dummy_session.rollback_called is True
    finally:
        app.dependency_overrides.clear()
