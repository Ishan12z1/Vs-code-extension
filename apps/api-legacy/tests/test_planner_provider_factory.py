from app.config import settings
from app.planner.providers.factory import build_planner_provider
from app.planner.providers.google_agentic import GoogleAgenticPlannerProvider
from app.planner.providers.mock import MockPlannerProvider


def test_provider_factory_builds_mock_provider(monkeypatch) -> None:
    monkeypatch.setattr(settings, "planner_provider", "mock")

    provider = build_planner_provider()

    assert isinstance(provider, MockPlannerProvider)


def test_provider_factory_builds_google_provider_when_configured(monkeypatch) -> None:
    monkeypatch.setattr(settings, "planner_provider", "google_agentic")
    monkeypatch.setattr(settings, "google_api_key", "test-key")
    monkeypatch.setattr(settings, "google_model", "gemini-test-model")
    monkeypatch.setattr(settings, "planner_provider_timeout_seconds", 15)

    provider = build_planner_provider()

    assert isinstance(provider, GoogleAgenticPlannerProvider)


def test_provider_factory_rejects_google_provider_without_api_key(monkeypatch) -> None:
    monkeypatch.setattr(settings, "planner_provider", "google_agentic")
    monkeypatch.setattr(settings, "google_api_key", None)

    try:
        build_planner_provider()
        raise AssertionError("Expected missing Google API key to raise.")
    except ValueError as exc:
        assert "no Google API key" in str(exc)
