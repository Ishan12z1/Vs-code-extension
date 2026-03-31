from fastapi import FastAPI

from app.config import settings
from app.routes.health import router as health_router
from app.routes.plan import router as plan_router
from app.routes.version import router as version_router
from app.routes.workspace_snapshot import router as workspace_snapshot_router

app = FastAPI(title=settings.app_name, version=settings.api_version)

app.include_router(health_router)
app.include_router(plan_router)
app.include_router(version_router)

app.include_router(workspace_snapshot_router)
