import * as vscode from "vscode";
import type { ExtensionRuntime } from "../state/runtime";
import { buildWorkspaceSummaryViewModel } from "../explain/buildWorkspaceSummaryViewModel";
import { createDefaultInspectors } from "../inspectors/createDefaultInspectors";
import { WorkspaceSnapshotBuilder } from "../inspectors/WorkspaceSnapshotBuilder";
import { showWorkspaceSummaryPanel } from "../webview/showWorkspaceSummaryPanel";

/**
 * User facing step command:
 * It:
 * 1. builds a fresh read only snapshot
 * 2. converts snapshot into a UI view model
 * 3. opens a summary panel
 */

export function registerExplainWorkspaceCommand(
  runtime: ExtensionRuntime
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "controlAgent.explainWorkspace",
    async () => {
      runtime.output.appendLine("[explain] building workspace snapshot");

      const builder = new WorkspaceSnapshotBuilder(
        runtime,
        createDefaultInspectors()
      );

      const snapshot = await builder.build();
      const viewModel = buildWorkspaceSummaryViewModel(snapshot);

      runtime.output.appendLine("[explain] workspace summary ready");
      showWorkspaceSummaryPanel(runtime, viewModel);
    }
  );
}
