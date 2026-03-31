import * as vscode from "vscode";
import { registerHelloCommand } from "./commands/registerHelloCommand";
import { registerInspectWorkspaceSnapshotCommand } from "./commands/registerInspectWorkspaceSnapshotCommand";
import { registerExplainWorkspaceCommand } from "./commands/registerExplainWorkspaceCommand";
import { createRuntime } from "./state/runtime";

export function activate(context: vscode.ExtensionContext): void {
  const runtime = createRuntime(context);

  runtime.output.appendLine("Activating VS Code Control Agent...");

  context.subscriptions.push(runtime.output);
  /**
   * Bootstrap/dev commands.
   */
  context.subscriptions.push(registerHelloCommand(runtime));
  context.subscriptions.push(registerInspectWorkspaceSnapshotCommand(runtime));
  /**
   * user-facing read-only explanation command.
   */
  context.subscriptions.push(registerExplainWorkspaceCommand(runtime));

  runtime.output.appendLine("VS Code Control Agent activated.");
}

export function deactivate(): void {
  // Keep empty for now.
}
