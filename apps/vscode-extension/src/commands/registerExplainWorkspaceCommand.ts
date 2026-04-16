import * as vscode from "vscode";
import type { ExtensionRuntime } from "../state/runtime";
import type { ControlAgentSidebarProvider } from "../webview/ControlAgentSidebarProvider";

/**
 * User-facing explain command.
 *
 * E6 change:
 * - route through the real sidebar open command first
 * - then run the explain flow inside that real shell
 *

 */
export function registerExplainWorkspaceCommand(
  runtime: ExtensionRuntime,
  sidebarProvider: ControlAgentSidebarProvider
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "controlAgent.explainWorkspace",
    async () => {
      runtime.output.appendLine(
        "[explain] routing through controlAgent.openSidebar before explain flow"
      );

      // Use the real shell command path first.
      await vscode.commands.executeCommand("controlAgent.openSidebar");

      // Then run the final explain flow inside that shell.
      await sidebarProvider.runExplainWorkspace("command -> explain workspace");
    }
  );
}
