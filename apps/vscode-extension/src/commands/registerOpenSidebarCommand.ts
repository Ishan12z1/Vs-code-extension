import * as vscode from "vscode";
import type { ExtensionRuntime } from "../state/runtime";
import type { ControlAgentSidebarProvider } from "../webview/ControlAgentSidebarProvider";
import { CONTROL_AGENT_SIDEBAR_VIEW_ID } from "../webview/sidebarViewId";

/**
 * Opens/focuses the real assistant sidebar.
 *
 * B2 adds a small state update so the shell reflects that the open command ran.
 */
export function registerOpenSidebarCommand(
  runtime: ExtensionRuntime,
  sidebarProvider: ControlAgentSidebarProvider
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "controlAgent.openSidebar",
    async () => {
      runtime.output.appendLine("[sidebar] open sidebar command triggered");

      await sidebarProvider.setStatus(
        "Open sidebar command executed.",
        "open sidebar command",
        "idle"
      );

      await vscode.commands.executeCommand(
        `${CONTROL_AGENT_SIDEBAR_VIEW_ID}.focus`
      );

      sidebarProvider.reveal(false);
    }
  );
}
