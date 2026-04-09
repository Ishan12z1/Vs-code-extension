import * as vscode from "vscode";
import type { ExtensionRuntime } from "../state/runtime";
import type { ControlAgentSidebarProvider } from "../webview/ControlAgentSidebarProvider";
import { CONTROL_AGENT_SIDEBAR_VIEW_ID } from "../webview/sidebarViewId";

/**
 * User-facing explain command.
 *
 * B3 changes the main behavior:
 * - focus the real sidebar
 * - run the explain flow inside the sidebar
 *
 * This replaces the separate-panel path as the main UX.
 */
export function registerExplainWorkspaceCommand(
  runtime: ExtensionRuntime,
  sidebarProvider: ControlAgentSidebarProvider
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "controlAgent.explainWorkspace",
    async () => {
      runtime.output.appendLine("[explain] focusing sidebar for explain flow");

      await vscode.commands.executeCommand(
        `${CONTROL_AGENT_SIDEBAR_VIEW_ID}.focus`
      );

      sidebarProvider.reveal(false);
      await sidebarProvider.runExplainWorkspace();
    }
  );
}
