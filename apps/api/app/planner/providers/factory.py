from __future__ import annotations

from app.config import settings
from app.planner.providers.base import PlannerProvider
from app.planner.providers.mock import MockPlannerProvider


def build_planner_provider() -> PlannerProvider:
    """
    Central provider selection point.

    supports only the mock provider.
    Later steps can add the real Google Agentic SDK adapter here without forcing
    the route layer to change.
    """
    provider_name = settings.planner_provider.strip().lower()

    if provider_name == "mock":
        return MockPlannerProvider()

    raise ValueError(f"Unsupported planner provider: {settings.planner_provider}")
