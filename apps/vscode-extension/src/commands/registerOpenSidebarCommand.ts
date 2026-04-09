import * as vscode from "vscode";
import type { ExtensionRuntime } from "../state/runtime";
import type { ControlAgentSidebarProvider } from "../webview/ControlAgentSidebarProvider";
import {
  CONTROL_AGENT_SIDEBAR_VIEW_ID,
  CONTROL_AGENT_VIEW_CONTAINER_ID,
} from "../webview/sidebarViewId";

/**
 * Opens/focuses the real assistant sidebar.
 *
 * B5 improves reliability:
 * - open the contributed view container first
 * - then focus the concrete sidebar view
 * - then reveal the mounted webview if available
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

      /**
       * Open the extension's custom view container in the Activity Bar.
       * This improves focus reliability when the user is in another side panel.
       */
      await vscode.commands.executeCommand(
        `workbench.view.extension.${CONTROL_AGENT_VIEW_CONTAINER_ID}`
      );

      /**
       * Then focus the specific contributed view inside that container.
       */
      await vscode.commands.executeCommand(
        `${CONTROL_AGENT_SIDEBAR_VIEW_ID}.focus`
      );

      /**
       * If the view is already mounted, reveal it explicitly too.
       */
      sidebarProvider.reveal(false);
    }
  );
}
