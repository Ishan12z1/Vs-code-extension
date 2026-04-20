from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas import DatabaseProofOfLifeResponse
from app.services.db_proof_of_life import create_and_read_back_run_smoke

router = APIRouter(prefix="/internal/db", tags=["internal"])


@router.post("/proof-of-life", response_model=DatabaseProofOfLifeResponse)
def run_database_proof_of_life(
    session: Session = Depends(get_db_session),
) -> DatabaseProofOfLifeResponse:
    """
    Performs one real DB proof-of-life write/read cycle.

    Why this route is POST:
    - it creates a real database row
    - GET should not have this kind of side effect

    Why this route is internal:
    - it is for backend verification during Step C
    - it is not a user-facing product endpoint
    """
    try:
        result = create_and_read_back_run_smoke(session)

        return DatabaseProofOfLifeResponse(
            status=result["status"],
            created_run_id=result["created_run_id"],
            request_text=result["request_text"],
            run_status=result["run_status"],
            message="Database proof-of-life write/read succeeded.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database proof-of-life failed: {exc}",
        ) from exc
