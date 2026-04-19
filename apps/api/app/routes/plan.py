from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.planner import get_planner_service
from app.planner.persistence import persist_planner_run
from app.planner.schemas import ErrorPayload, PlanError, PlanRequest, PlanResponse
from app.planner.service import PlannerService

router = APIRouter(prefix="/plan", tags=["plan"])


@router.post("", response_model=PlanResponse)
def create_plan(
    payload: PlanRequest,
    session: Session = Depends(get_db_session),
    planner_service: PlannerService = Depends(get_planner_service),
) -> PlanResponse:
    """
    Real planner entry route.

    What this route does now:
    - FastAPI validates PlanRequest at the request boundary
    - delegates planner execution to PlannerService
    - persists the resulting run/plan/action artifacts
    - returns the final public PlanResponse

    Why this is the right shape:
    - route stays thin
    - planner logic stays in planner service
    - DB writes stay in persistence code
    - dependencies are overrideable in tests
    """
    record = planner_service.generate_record(payload)

    try:
        persist_planner_run(
            session=session,
            payload=payload,
            record=record,
        )
    except Exception as exc:
        session.rollback()

        return ErrorPayload(
            kind="error",
            error=PlanError(
                code="internal_error",
                message="Planner response could not be persisted.",
                details={
                    "requestId": payload.userRequest.id,
                    "errorType": type(exc).__name__,
                    "errorMessage": str(exc),
                },
            ),
        )

    return record.response
