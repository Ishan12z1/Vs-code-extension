from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_plan_placeholder() -> None:
    response = client.post(
        "/plan",
        json={"user_request": "Set up Python formatting for this workspace"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "placeholder"
    assert body["received_request"] == "Set up Python formatting for this workspace"