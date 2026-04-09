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
 * B2 keeps startup simple while wiring the live sidebar bridge.
 */
export function activate(context: vscode.ExtensionContext): void {
  const runtime = createRuntime(context);

  runtime.output.appendLine("Activating VS Code Control Agent...");

  context.subscriptions.push(runtime.output);

  const sidebarProvider = new ControlAgentSidebarProvider(runtime);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CONTROL_AGENT_SIDEBAR_VIEW_ID,
      sidebarProvider
    )
  );

  context.subscriptions.push(registerHelloCommand(runtime));
  context.subscriptions.push(registerInspectWorkspaceSnapshotCommand(runtime));
  context.subscriptions.push(registerExplainWorkspaceCommand(runtime));
  context.subscriptions.push(
    registerOpenSidebarCommand(runtime, sidebarProvider)
  );

  runtime.output.appendLine("VS Code Control Agent activated.");
}

export function deactivate(): void {
  // Nothing to tear down yet.
}
