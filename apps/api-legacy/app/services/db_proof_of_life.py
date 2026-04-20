from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.run import Run


def create_and_read_back_run_smoke(session: Session) -> dict[str, str]:
    """
    Performs one real database write/read cycle using the runs table.

    Why this exists:
    - Step C needs proof that the DB layer is real, not just migrations on disk
    - writing and reading a Run row is the smallest honest persistence check
    - this stays intentionally simple and does not pretend planner persistence exists yet
    """
    smoke_request_text = f"step-c-proof-of-life-{uuid.uuid4()}"

    # Create one small sample run row.
    # Keep the values explicit so it is obvious in the database what this row is for.
    run = Run(
        request_text=smoke_request_text,
        request_class="inspect",
        status="proof_of_life",
        metadata_json={
            "source": "internal_db_proof_of_life_route",
            "purpose": "step_c_smoke_test",
        },
    )

    # Persist the row.
    session.add(run)
    session.commit()

    # Refresh so SQLAlchemy reloads DB-populated/default fields.
    session.refresh(run)

    # Read the same row back from the DB.
    read_back = session.get(Run, run.id)

    if read_back is None:
        raise RuntimeError("Proof-of-life write succeeded, but read-back failed.")

    return {
        "status": "ok",
        "created_run_id": str(read_back.id),
        "request_text": read_back.request_text,
        "run_status": read_back.status,
    }
