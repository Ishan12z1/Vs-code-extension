from app.planner.schemas import (
    WorkspaceSnapshot,
    WorkspaceSnapshotAcceptanceRequest,
    WorkspaceSnapshotAcceptanceResponse,
    WorkspaceSnapshotAcceptanceSummary,
)


def _count_parsed_vscode_files(snapshot: WorkspaceSnapshot) -> int:
    """
    Counts how many managed .vscode/* files were present and parsed successfully.
    """
    files = [
        snapshot.vscodeFiles.settingsJson,
        snapshot.vscodeFiles.tasksJson,
        snapshot.vscodeFiles.launchJson,
        snapshot.vscodeFiles.extensionsJson,
    ]

    return sum(1 for file in files if file.parseStatus == "parsed")


def _count_invalid_vscode_files(snapshot: WorkspaceSnapshot) -> int:
    """
    Counts how many managed .vscode/* files exist but failed JSONC parsing.
    """
    files = [
        snapshot.vscodeFiles.settingsJson,
        snapshot.vscodeFiles.tasksJson,
        snapshot.vscodeFiles.launchJson,
        snapshot.vscodeFiles.extensionsJson,
    ]

    return sum(1 for file in files if file.parseStatus == "invalid_jsonc")


def _build_warnings(snapshot: WorkspaceSnapshot) -> list[str]:
    """
    Produces lightweight acceptance warnings.

    This is not diagnosis or planning.
    It just flags obviously noteworthy acceptance conditions.
    """
    warnings: list[str] = []

    if len(snapshot.workspaceFolders) == 0:
        warnings.append("No workspace folders were present in the accepted snapshot.")

    invalid_vscode_file_count = _count_invalid_vscode_files(snapshot)
    if invalid_vscode_file_count > 0:
        warnings.append(
            f"{invalid_vscode_file_count} managed .vscode file(s) were invalid JSONC."
        )

    if not snapshot.vscodeFolderPresent:
        warnings.append("No managed .vscode folder state was detected in the snapshot.")

    return warnings


def build_workspace_snapshot_acceptance_response(
    payload: WorkspaceSnapshotAcceptanceRequest,
) -> WorkspaceSnapshotAcceptanceResponse:
    """
    Builds the  backend acceptance response.

    Important:
    - validates through the request model before this point
    - does not do planning
    - does not persist yet
    - does not mutate anything
    """
    snapshot = payload.snapshot

    summary = WorkspaceSnapshotAcceptanceSummary(
        workspaceFolderCount=len(snapshot.workspaceFolders),
        detectedMarkerCount=len(snapshot.detectedMarkers),
        relevantFileCount=len(snapshot.relevantFiles),
        installedTargetExtensionCount=len(snapshot.installedTargetExtensions),
        parsedVscodeFileCount=_count_parsed_vscode_files(snapshot),
        invalidVscodeFileCount=_count_invalid_vscode_files(snapshot),
        noteCount=len(snapshot.notes),
    )

    warnings = _build_warnings(snapshot)

    return WorkspaceSnapshotAcceptanceResponse(
        accepted=True,
        message="Workspace snapshot accepted and validated.",
        summary=summary,
        warnings=warnings,
    )