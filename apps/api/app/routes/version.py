from fastapi import APIRouter

from app.config import settings
from app.schemas import VersionResponse

router = APIRouter(tags=["meta"])


@router.get("/version", response_model=VersionResponse)
def get_version() -> VersionResponse:
    return VersionResponse(
        name=settings.app_name,
        version=settings.api_version,
        environment=settings.environment,
    )