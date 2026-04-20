from fastapi import APIRouter, HTTPException

from app.db.raw_connection import test_database_connection
from app.schemas import DatabaseHealthResponse

router = APIRouter(tags=["health"])


@router.get("/health/db", response_model=DatabaseHealthResponse)
def get_database_health() -> DatabaseHealthResponse:
    """
    DB connection health check.
    """
    try:
        result = test_database_connection()
        return DatabaseHealthResponse(**result)
    except Exception as exc:
        # Keep the failure explicit so local setup problems are obvious.
        raise HTTPException(
            status_code=503,
            detail=f"Database connectivity check failed: {exc}",
        ) from exc
