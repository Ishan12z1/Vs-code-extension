from fastapi import APIRouter

from app.planner.providers.factory import build_planner_provider
from app.planner.schemas import PlanRequest, PlanResponse
from app.planner.service import PlannerService

router = APIRouter(prefix="/plan", tags=["plan"])

# Step 6.1:
# Build one planner service backed by the configured provider.
# Right now that provider is still the mock placeholder provider.
planner_service = PlannerService(provider=build_planner_provider())


@router.post("", response_model=PlanResponse)
def create_plan(payload: PlanRequest) -> PlanResponse:
    """
    Planner entry route.

    What this route does now:
    - FastAPI validates the shared PlanRequest at the request boundary
    - the route delegates planner work to PlannerService
    - PlannerService delegates to a PlannerProvider
    - the current provider is still a structured placeholder

    What this route intentionally does NOT do yet:
    - request classification
    - real planning
    - prompt orchestration
    - provider SDK wiring
    - persistence
    """
    return planner_service.generate(payload)
