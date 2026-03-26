from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_version() -> None:
    response = client.get("/version")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "VS Code Control Agent API"
    assert "version" in body
    assert "environment" in body