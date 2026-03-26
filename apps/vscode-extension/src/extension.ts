import * as vscode from "vscode";
import { registerHelloCommand } from "./commands/registerHelloCommand";
import { createRuntime } from "./state/runtime";

export function activate(context: vscode.ExtensionContext): void {
  const runtime = createRuntime(context);

  runtime.output.appendLine("Activating VS Code Control Agent...");

  context.subscriptions.push(runtime.output);
  context.subscriptions.push(registerHelloCommand(runtime));

  runtime.output.appendLine("VS Code Control Agent activated.");
}

export function deactivate(): void {
  // Keep empty for now.
}