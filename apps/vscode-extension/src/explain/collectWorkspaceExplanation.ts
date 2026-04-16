import type { WorkspaceSnapshot } from "@control-agent/contracts";

import type { ExtensionRuntime } from "../state/runtime";
import { createDefaultInspectors } from "../inspectors/createDefaultInspectors";
import { WorkspaceSnapshotBuilder } from "../inspectors/WorkspaceSnapshotBuilder";
import { buildWorkspaceSummaryViewModel } from "./buildWorkspaceSummaryViewModel";
import type { WorkspaceSummaryViewModel } from "./workspaceSummaryTypes";

/**
 * Final collected explain result used by the sidebar explain flow.
 *
 * Why this exists:
 * - centralize the real explain pipeline in one place
 * - later command/button/sidebar entry points should all depend on the same
 *   snapshot -> summary path
 * - this keeps the explain flow from drifting into several slightly different
 *   implementations
 */
export interface CollectedWorkspaceExplanation {
  readonly snapshot: WorkspaceSnapshot;
  readonly explanation: WorkspaceSummaryViewModel;
}

/**
 * Collects the current workspace snapshot and converts it into the final
 * user-facing explanation view model.
 *
 * This is the one canonical explain pipeline for the extension shell.
 */
export async function collectWorkspaceExplanation(
  runtime: ExtensionRuntime
): Promise<CollectedWorkspaceExplanation> {
  const builder = new WorkspaceSnapshotBuilder(
    runtime,
    createDefaultInspectors()
  );

  const snapshot = await builder.build();
  const explanation = buildWorkspaceSummaryViewModel(snapshot);

  return {
    snapshot,
    explanation,
  };
}
