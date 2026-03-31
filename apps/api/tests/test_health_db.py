from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_database_health_success(monkeypatch) -> None:
    """
    Route-level success test without needing a real Postgres container.
    """

    def fake_test_database_connection() -> dict:
        return {
            "status": "ok",
            "database_name": "control_agent",
        }

    monkeypatch.setattr(
        "app.routes.health_db.test_database_connection",
        fake_test_database_connection,
    )

    response = client.get("/health/db")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database_name": "control_agent",
    }


def test_database_health_failure(monkeypatch) -> None:
    """
    Route-level failure test without needing a real Postgres container.
    """

    def fake_test_database_connection() -> dict:
        raise RuntimeError("connection refused")

    monkeypatch.setattr(
        "app.routes.health_db.test_database_connection",
        fake_test_database_connection,
    )

    response = client.get("/health/db")

    assert response.status_code == 503
    assert "Database connectivity check failed" in response.json()["detail"]
