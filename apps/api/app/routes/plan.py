from fastapi import APIRouter
from pydantic import ValidationError

from app.planner.schemas import PlanRequest

router = APIRouter(prefix="/plan", tags=["plan"])


@router.post("")
def create_plan(payload: dict):
    try:
        validated = PlanRequest.model_validate(payload)
    except ValidationError as exc:
        return {
            "kind": "error",
            "error": {
                "code": "invalid_request_payload",
                "message": exc.errors()[0]["msg"],
            },
        }

    return {
        "kind": "error",
        "error": {
            "code": "not_implemented",
            "message": f"Planning not implemented yet for request: {validated.userRequest.text}",
        },
    }
