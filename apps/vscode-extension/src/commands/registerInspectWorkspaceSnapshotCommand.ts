import * as vscode from "vscode";
import type { ExtensionRuntime } from "../state/runtime";
import { createDefaultInspectors } from "../inspectors/createDefaultInspectors";
import { WorkspaceSnapshotBuilder } from "../inspectors/WorkspaceSnapshotBuilder";

/**
 * Temporary smoke-test command .
 * This is not the final summary UI.
 * It just proves the builder works and logs the snapshot.
 */
export function registerInspectWorkspaceSnapshotCommand(
  runtime: ExtensionRuntime
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "controlAgent.inspectWorkspaceSnapshot",
    async () => {
      const builder = new WorkspaceSnapshotBuilder(
        runtime,
        createDefaultInspectors()
      );

      const snapshot = await builder.build();

      runtime.output.appendLine("[inspect] snapshot build complete");
      runtime.output.appendLine(JSON.stringify(snapshot, null, 2));
      runtime.output.show(true);

      await vscode.window.showInformationMessage(
        "Workspace snapshot collected. Check the output panel."
      );
    }
  );
}