import * as vscode from "vscode";
import type { ExtensionRuntime } from "../state/runtime";
import type { SetupInspectionService } from "../services/SetupInspectionService";

/**
 * User-facing inspect command.
 *
 * Phase 2.4 change:
 * - the command no longer constructs WorkspaceSnapshotBuilder directly
 * - snapshot collection now goes through SetupInspectionService
 *
 * Why this matters:
 * - keeps the command handler thin
 * - moves application logic behind a service boundary
 */
export function registerInspectWorkspaceSnapshotCommand(
  runtime: ExtensionRuntime,
  setupInspectionService: SetupInspectionService
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "controlAgent.inspectWorkspaceSnapshot",
    async () => {
      const snapshot = await setupInspectionService.collectSnapshot();

      runtime.output.appendLine("[inspect] snapshot build complete");
      runtime.output.appendLine(JSON.stringify(snapshot, null, 2));
      runtime.output.show(true);

      await vscode.window.showInformationMessage(
        "Workspace snapshot collected. Check the output panel."
      );
    }
  );
}
