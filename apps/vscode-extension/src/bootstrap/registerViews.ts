import * as vscode from "vscode";
import type { ServiceContainer } from "./serviceContainer";
import { CONTROL_AGENT_SIDEBAR_VIEW_ID } from "../webview/sidebarViewId";

/**
 * Registers VS Code views owned by the extension.
 *
 * Why this file exists:
 * - keeps view registration out of extension.ts
 * - gives us one place to grow when more views are added later
 */
export function registerViews(
  context: vscode.ExtensionContext,
  services: ServiceContainer
): void {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CONTROL_AGENT_SIDEBAR_VIEW_ID,
      services.sidebarProvider
    )
  );
}
