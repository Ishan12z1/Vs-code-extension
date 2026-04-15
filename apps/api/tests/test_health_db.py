from fastapi.testclient import TestClient

from app.main import app
from app.routes import health_db

client = TestClient(app)


def test_health_db_returns_database_status(monkeypatch) -> None:
    def fake_test_database_connection() -> dict[str, str]:
        return {
            "status": "ok",
            "database_name": "agent_test_db",
        }

    monkeypatch.setattr(
        health_db,
        "test_database_connection",
        fake_test_database_connection,
    )

    response = client.get("/health/db")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database_name": "agent_test_db",
    }


def test_health_db_returns_503_on_connection_failure(monkeypatch) -> None:
    def fake_test_database_connection() -> dict[str, str | None]:
        raise RuntimeError("db offline")

    monkeypatch.setattr(
        health_db,
        "test_database_connection",
        fake_test_database_connection,
    )

    response = client.get("/health/db")

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Database connectivity check failed: db offline",
    }
