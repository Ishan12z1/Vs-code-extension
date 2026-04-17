from __future__ import annotations

from app.planner.classifier import RequestClassifier
from app.planner.providers.base import PlannerProvider
from app.planner.schemas import ErrorPayload, PlanError, PlanRequest, PlanResponse


class PlannerService:
    """
    Thin backend orchestration layer for planner calls.

    Step 6.2 adds:
    - request classification before provider execution
    - early unsupported-request rejection

    Still intentionally missing:
    - model orchestration
    - prompt construction
    - plan validation/repair
    - persistence
    """

    def __init__(
        self,
        provider: PlannerProvider,
        classifier: RequestClassifier | None = None,
    ) -> None:
        self._provider = provider
        self._classifier = classifier or RequestClassifier()

    def generate(self, payload: PlanRequest) -> PlanResponse:
        """
        Resolve request class first, reject obviously unsupported asks early,
        then delegate to the configured provider.
        """
        classification = self._classifier.classify(payload)

        if not classification.isSupported:
            return ErrorPayload(
                kind="error",
                error=PlanError(
                    code="unsupported_request",
                    message=classification.unsupportedReason or "This request is not supported.",
                    details={
                        "requestId": payload.userRequest.id,
                        "requestClassHint": payload.userRequest.requestClassHint,
                        "resolvedRequestClass": classification.requestClass,
                        "classificationSource": classification.source,
                        "classificationReason": classification.reason,
                        "classificationWarnings": classification.warnings,
                    },
                ),
            )

        return self._provider.generate(payload, classification)
