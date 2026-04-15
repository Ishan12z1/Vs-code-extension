from fastapi import APIRouter

from app.planner.schemas import ErrorPayload, PlanError, PlanRequest, PlanResponse

router = APIRouter(prefix="/plan", tags=["plan"])


@router.post("", response_model=PlanResponse)
def create_plan(payload: PlanRequest) -> ErrorPayload:
    """
    Planner entry route.
    - FastAPI now validates PlanRequest at the real request boundary
    - malformed shared payloads fail with 422 before this handler runs
    - the route keeps returning a structured not_implemented error for now
      because planner logic still belongs to later steps
    """
    return ErrorPayload(
        kind="error",
        error=PlanError(
            code="not_implemented",
            message=(f"Planning is not implemented yet for request: {payload.userRequest.text}"),
            details={
                "requestId": payload.userRequest.id,
                "requestClassHint": payload.userRequest.requestClassHint,
            },
        ),
    )
