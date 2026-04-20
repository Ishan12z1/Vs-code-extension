"""
Legacy backend path.

This module is not part of the primary V1 local-first execution path.
Keep for migration/reference only unless explicitly working on legacy code.
"""

from fastapi import FastAPI

from app.config import settings
from app.routes.db_proof_of_life import router as db_proof_of_life_router
from app.routes.health import router as health_router
from app.routes.health_db import router as health_db_router
from app.routes.plan import router as plan_router
from app.routes.version import router as version_router
from app.routes.workspace_snapshot import router as workspace_snapshot_router

app = FastAPI(title=settings.app_name, version=settings.api_version)

app.include_router(health_router)
app.include_router(plan_router)
app.include_router(version_router)

app.include_router(workspace_snapshot_router)
app.include_router(health_db_router)
app.include_router(db_proof_of_life_router)
