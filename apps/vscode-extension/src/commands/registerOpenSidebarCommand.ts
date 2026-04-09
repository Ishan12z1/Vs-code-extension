import * as vscode from "vscode";
import type { ExtensionRuntime } from "../state/runtime";
import type { ControlAgentSidebarProvider } from "../webview/ControlAgentSidebarProvider";
import { CONTROL_AGENT_SIDEBAR_VIEW_ID } from "../webview/sidebarViewId";

/**
 * Opens/focuses the real assistant sidebar.
 *
 * Important:
 * - first asks VS Code to focus the view by id
 * - then asks the provider to reveal the mounted view if present
 *
 * This is the real shell entry command
 */
export function registerOpenSidebarCommand(
  runtime: ExtensionRuntime,
  sidebarProvider: ControlAgentSidebarProvider
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "controlAgent.openSidebar",
    async () => {
      runtime.output.appendLine("[sidebar] open sidebar command triggered");

      /**
       * This is the canonical VS Code way to reveal a contributed view.
       */
      await vscode.commands.executeCommand(
        `${CONTROL_AGENT_SIDEBAR_VIEW_ID}.focus`
      );

      /**
       * If the view is already mounted, reveal it explicitly too.
       * This is harmless and makes focus behavior clearer.
       */
      sidebarProvider.reveal(false);
    }
  );
}
