from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect

from app.db.session import engine
from app.main import app

client = TestClient(app)


def _database_schema_ready() -> bool:
    """
    Checks whether the migrated Step C schema is present.

    We skip this test when:
    - Postgres is not running
    - migrations were not applied yet

    Why skip instead of hard fail:
    - regular unit-style test runs should still work without a live DB
    - this test is specifically for the real migrated Postgres path
    """
    try:
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())

        required_tables = {
            "runs",
            "plans",
            "plan_actions",
            "approvals",
            "executions",
            "rollback_snapshots",
            "eval_runs",
            "recipe_cache",
        }

        return required_tables.issubset(tables)
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _database_schema_ready(),
    reason="Requires running Postgres with Step C migrations applied.",
)


def test_database_proof_of_life_route_succeeds() -> None:
    """
    Calls the internal proof-of-life route and verifies the returned payload.

    This is the main Step C integration check that the backend can:
    - open a DB session
    - write a real row
    - read it back
    - return a stable response
    """
    response = client.post("/internal/db/proof-of-life")

    assert response.status_code == 200

    body = response.json()

    assert body["status"] == "ok"
    assert body["created_run_id"]
    assert body["request_text"].startswith("step-c-proof-of-life-")
    assert body["run_status"] == "proof_of_life"
    assert body["message"] == "Database proof-of-life write/read succeeded."
