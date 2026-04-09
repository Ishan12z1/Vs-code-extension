import * as vscode from "vscode";
import { registerExplainWorkspaceCommand } from "./commands/registerExplainWorkspaceCommand";
import { registerHelloCommand } from "./commands/registerHelloCommand";
import { registerInspectWorkspaceSnapshotCommand } from "./commands/registerInspectWorkspaceSnapshotCommand";
import { registerOpenSidebarCommand } from "./commands/registerOpenSidebarCommand";
import { createRuntime } from "./state/runtime";
import { ControlAgentSidebarProvider } from "./webview/ControlAgentSidebarProvider";
import { CONTROL_AGENT_SIDEBAR_VIEW_ID } from "./webview/sidebarViewId";

/**
 * Extension entry point.
 *
 * B1 goal:
 * - keep startup simple
 * - register the real sidebar shell
 * - keep existing commands working
 */
export function activate(context: vscode.ExtensionContext): void {
  const runtime = createRuntime(context);

  runtime.output.appendLine("Activating VS Code Control Agent...");

  context.subscriptions.push(runtime.output);

  /**
   * Register the real sidebar provider first.
   * This gives the extension a real home in the VS Code UI.
   */
  const sidebarProvider = new ControlAgentSidebarProvider(runtime);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CONTROL_AGENT_SIDEBAR_VIEW_ID,
      sidebarProvider
    )
  );

  /**
   * Existing bootstrap/debug commands.
   */
  context.subscriptions.push(registerHelloCommand(runtime));
  context.subscriptions.push(registerInspectWorkspaceSnapshotCommand(runtime));

  /**
   * Existing explain command still works for now.
   * B3 will move its main UX into the sidebar shell.
   */
  context.subscriptions.push(registerExplainWorkspaceCommand(runtime));

  /**
   * New shell entry command.
   */
  context.subscriptions.push(
    registerOpenSidebarCommand(runtime, sidebarProvider)
  );

  runtime.output.appendLine("VS Code Control Agent activated.");
}

export function deactivate(): void {
  // Nothing to tear down yet.
}
