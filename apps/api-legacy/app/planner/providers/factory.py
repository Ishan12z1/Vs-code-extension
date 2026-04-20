from __future__ import annotations

from app.config import settings
from app.planner.providers.base import PlannerProvider
from app.planner.providers.google_agentic import GoogleAgenticPlannerProvider
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

    if provider_name == "google_agentic":
        if not settings.google_api_key:
            raise ValueError("planner_provider is 'google_agentic' but no Google API key is configured.")

        return GoogleAgenticPlannerProvider(
            api_key=settings.google_api_key,
            model_name=settings.google_model,
            timeout_seconds=settings.planner_provider_timeout_seconds,
        )
    raise ValueError(f"Unsupported planner provider: {settings.planner_provider}")
