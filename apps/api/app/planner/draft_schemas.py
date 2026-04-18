from __future__ import annotations

from typing import Dict, List, Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

from app.planner.schemas import ExplanationResponse
from app.planner.schemas.contracts import ActionScope, ActionType, RiskLevel


class DraftModel(BaseModel):
    """
    Backend-only model-facing schema base.

    Important:
    - this is NOT a shared public API contract
    - this is only what the model is asked to generate
    """

    model_config = ConfigDict(extra="forbid")


class DraftPlannedAction(DraftModel):
    """
    Smaller model-facing action shape.

    We intentionally omit backend-owned execution metadata such as:
    - requiresApproval
    - preview
    - executionMethod
    - rollbackMethod
    """

    id: str
    actionType: ActionType
    scope: ActionScope
    target: str
    parameters: Dict[str, object] = Field(default_factory=dict)
    riskLevel: RiskLevel


class DraftExecutionPlan(DraftModel):
    """
    Smaller model-facing execution plan shape.

    Important:
    - no top-level "kind"
    - no backend-owned approval block
    - no backend-owned execution metadata on actions
    """

    id: str
    summary: str
    explanation: str
    requestClass: Literal["configure", "repair", "guide"]
    actions: List[DraftPlannedAction]


_MODEL_DRAFT_PLAN_ADAPTER = TypeAdapter(DraftExecutionPlan)
_MODEL_EXPLANATION_ADAPTER = TypeAdapter(ExplanationResponse)


def validate_model_draft_execution_plan(payload: dict):
    """
    Validate model output for plan/retry mode.

    The model now returns only the draft execution plan object,
    not a wrapped {"kind":"plan","data":...} payload.
    """
    return _MODEL_DRAFT_PLAN_ADAPTER.validate_python(payload)


def validate_model_explanation_response(payload: dict):
    """
    Validate model output for explanation mode.

    The model now returns only the explanation object,
    not a wrapped {"kind":"explanation","data":...} payload.
    """
    return _MODEL_EXPLANATION_ADAPTER.validate_python(payload)
