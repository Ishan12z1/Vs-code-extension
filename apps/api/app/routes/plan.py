from fastapi import APIRouter
from app.schemas import PlanPlaceholderRequest,PlanPlaceholderResponse

router=APIRouter(prefix="/plan",tags=["plan"])

@router.post("",response_model=PlanPlaceholderResponse)
def create_plan(payload:PlanPlaceholderRequest)->PlanPlaceholderResponse:
    return PlanPlaceholderResponse(
        status="placeholder",
        message="Not implemented",
        received_request=payload.user_request
    )