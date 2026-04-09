import * as vscode from "vscode";
import type { ExtensionRuntime } from "../state/runtime";
import { renderSidebarShellHtml } from "./renderSidebarShellHtml";

/**
 * Real sidebar provider for the extension shell.
 *
 * scope :
 * - register a sidebar webview
 * - render a minimal static shell
 *
 */
export class ControlAgentSidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;

  public constructor(private readonly runtime: ExtensionRuntime) {}

  /**
   * Exposes the current view instance so commands can reveal/focus it later.
   */
  public getView(): vscode.WebviewView | undefined {
    return this.view;
  }

  /**
   * Called by VS Code when the sidebar view is created or restored.
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: false,
    };

    webviewView.webview.html = renderSidebarShellHtml({
      title: "Control Agent",
      subtitle:
        "VS Code-native assistant shell. Read-only explain and interactive flows will be mounted here.",
    });

    this.runtime.output.appendLine("[sidebar] sidebar view resolved");
  }

  /**
   * Tries to reveal the sidebar if a view instance already exists.
   *
   * This does not force-construct the view. VS Code creates the view
   * when the container/view is opened.
   */
  public reveal(preserveFocus = false): void {
    this.view?.show?.(preserveFocus);
  }
}
