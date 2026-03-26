import * as vscode from "vscode";
import type { ExtensionRuntime } from "../state/runtime";

export function registerHelloCommand(
  runtime: ExtensionRuntime
): vscode.Disposable {
  return vscode.commands.registerCommand("controlAgent.hello", async () => {
    const config = vscode.workspace.getConfiguration("controlAgent");
    const backendUrl = config.get<string>(
      "backendUrl",
      "http://127.0.0.1:8000"
    );
    const enableDebugLogs = config.get<boolean>("enableDebugLogs", false);

    runtime.output.appendLine("[command] controlAgent.hello");
    runtime.output.appendLine(`[config] backendUrl=${backendUrl}`);
    runtime.output.appendLine(`[config] enableDebugLogs=${enableDebugLogs}`);

    if (enableDebugLogs) {
      runtime.output.show(true);
    }

    await vscode.window.showInformationMessage(
      "VS Code Control Agent booted successfully."
    );
  });
}