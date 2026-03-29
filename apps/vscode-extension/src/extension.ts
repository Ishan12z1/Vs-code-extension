import * as vscode from "vscode";
import { registerHelloCommand } from "./commands/registerHelloCommand";
import { registerInspectWorkspaceSnapshotCommand } from "./commands/registerInspectWorkspaceSnapshotCommand";
import { createRuntime } from "./state/runtime";

export function activate(context: vscode.ExtensionContext): void {
  const runtime = createRuntime(context);

  runtime.output.appendLine("Activating VS Code Control Agent...");
  // Register shared disposables first.
  context.subscriptions.push(runtime.output);
  context.subscriptions.push(registerHelloCommand(runtime));

  context.subscriptions.push(registerInspectWorkspaceSnapshotCommand(runtime));

  runtime.output.appendLine("VS Code Control Agent activated.");
}

export function deactivate(): void {
  // Keep empty for now.
}