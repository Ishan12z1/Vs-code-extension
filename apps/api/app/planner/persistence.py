from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.plan import Plan
from app.models.plan_actions import PlanAction
from app.models.run import Run
from app.planner.result import PlannerRunRecord
from app.planner.schemas import PlanRequest


@dataclass(slots=True)
class PersistedPlannerArtifacts:
    """
    Small return object so callers can inspect what was written.
    """

    run_id: str
    plan_id: str | None = None
    action_count: int = 0


def persist_planner_run(
    *,
    session: Session,
    payload: PlanRequest,
    record: PlannerRunRecord,
) -> PersistedPlannerArtifacts:
    """
    Persist one planner request lifecycle.

    What gets written:
    - always: one Run row
    - when response.kind == "plan": one Plan row + normalized PlanAction rows

    Why this split:
    - every request should have a durable run row
    - only plan responses need plan/action rows
    - explanation/error responses still belong in run metadata
    """
    response = record.response

    run = Run(
        request_text=payload.userRequest.text,
        request_class=record.resolved_request_class,
        status=record.run_status,
        metadata_json={
            "requestId": payload.userRequest.id,
            "requestClassHint": payload.userRequest.requestClassHint,
            "classificationSource": record.classification_source,
            "classificationReason": record.classification_reason,
            "classificationWarnings": record.classification_warnings,
            "promptMode": record.prompt_mode,
            "supportsPlanning": record.supports_planning,
            "providerName": record.provider_name,
            "providerModel": record.provider_model,
            "providerResponseId": record.provider_response_id,
            "providerFinishReason": record.provider_finish_reason,
            "retryAttempted": record.retry_attempted,
            "responseKind": response.kind,
            # Keep the raw preview only as a preview, not a giant blob.
            "providerRawTextPreview": record.raw_text_preview,
            # For non-plan responses, keep the final public response in run metadata.
            "responseJson": (response.model_dump(mode="json") if response.kind != "plan" else None),
        },
    )

    session.add(run)
    session.flush()

    plan_row: Plan | None = None

    if response.kind == "plan":
        plan_row = Plan(
            run_id=run.id,
            plan_json=response.model_dump(mode="json"),
            risk_summary=response.data.approval.reason,
            planner_version=record.provider_model or record.provider_name,
            action_count=len(response.data.actions),
        )
        session.add(plan_row)
        session.flush()

        for index, action in enumerate(response.data.actions):
            session.add(
                PlanAction(
                    plan_id=plan_row.id,
                    action_index=index,
                    action_type=action.actionType,
                    scope=action.scope,
                    risk_level=action.riskLevel,
                    requires_approval=action.requiresApproval,
                    target=action.target,
                    parameters_json=action.parameters,
                    preview_json=action.preview.model_dump(mode="json"),
                )
            )

    session.commit()
    session.refresh(run)

    if plan_row is not None:
        session.refresh(plan_row)

    return PersistedPlannerArtifacts(
        run_id=str(run.id),
        plan_id=str(plan_row.id) if plan_row is not None else None,
        action_count=len(response.data.actions) if response.kind == "plan" else 0,
    )
