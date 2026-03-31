from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_plan_returns_not_implemented_error() -> None:
    response = client.post(
        "/plan",
        json={
            "userRequest": {
                "id": "req-1",
                "text": "Set up Python formatting for this workspace",
            },
            "workspaceSnapshot": {},
        },
    )

    assert response.status_code == 200

    body = response.json()
    assert body["kind"] == "error"
    assert body["error"]["code"] == "not_implemented"
    assert (
        body["error"]["message"]
        == "Planning not implemented yet for request: Set up Python formatting for this workspace"
    )
