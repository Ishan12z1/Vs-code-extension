import * as vscode from "vscode";
import type { ExtensionRuntime } from "../state/runtime";
import type { WorkspaceSummaryViewModel } from "../explain/workspaceSummaryTypes";
import { renderWorkspaceSummaryHtml } from "./renderWorkspaceSummaryHtml";

/**
 * Opens a simple read-only webview panel for the current workspace summary.
 *
 * This is intentionally a panel, not the final sidebar shell.
 * The full assistant sidebar belongs to a different step.
 */
export function showWorkspaceSummaryPanel(
  runtime: ExtensionRuntime,
  viewModel: WorkspaceSummaryViewModel
): void {
  const panel = vscode.window.createWebviewPanel(
    "controlAgent.workspaceSummary",
    "VS Code Setup Summary",
    vscode.ViewColumn.Active,
    {
      enableScripts: false,
      retainContextWhenHidden: false
    }
  );

  panel.webview.html = renderWorkspaceSummaryHtml(viewModel);

  runtime.output.appendLine("[explain] rendered workspace summary panel");
}