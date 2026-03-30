from fastapi import APIRouter

from app.planner.schemas import (
    WorkspaceSnapshotAcceptanceRequest,
    WorkspaceSnapshotAcceptanceResponse,
)
from app.services.workspace_snapshot_acceptance import (
    build_workspace_snapshot_acceptance_response,
)

router = APIRouter(prefix="/workspace-snapshots", tags=["workspace-snapshots"])


@router.post("/accept", response_model=WorkspaceSnapshotAcceptanceResponse)
def accept_workspace_snapshot(
    payload: WorkspaceSnapshotAcceptanceRequest,
) -> WorkspaceSnapshotAcceptanceResponse:
    """
    This endpoint proves that the backend can accept and validate the
    extension-produced WorkspaceSnapshot contract before Step 6 planning begins.
    """
    return build_workspace_snapshot_acceptance_response(payload)