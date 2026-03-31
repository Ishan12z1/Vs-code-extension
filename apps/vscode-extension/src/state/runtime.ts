import * as vscode from "vscode";

export interface ExtensionRuntime {
  readonly context: vscode.ExtensionContext;
  readonly output: vscode.OutputChannel;
  readonly extensionUri: vscode.Uri;
}

export function createRuntime(
  context: vscode.ExtensionContext
): ExtensionRuntime {
  return {
    context,
    output: vscode.window.createOutputChannel("VS Code Control Agent"),
    extensionUri: context.extensionUri,
  };
}
