from __future__ import annotations

from app.planner.providers.factory import build_planner_provider
from app.planner.service import PlannerService


def get_planner_service() -> PlannerService:
    """
    FastAPI dependency for planner access.

    Why this exists:
    - keeps route wiring clean
    - avoids hardcoding one module-level planner instance inside the route
    - makes testing much easier because the dependency can be overridden
    """
    provider = build_planner_provider()
    return PlannerService(provider=provider)
