import * as vscode from "vscode";
import { registerExplainWorkspaceCommand } from "../commands/registerExplainWorkspaceCommand";
import { registerHelloCommand } from "../commands/registerHelloCommand";
import { registerInspectWorkspaceSnapshotCommand } from "../commands/registerInspectWorkspaceSnapshotCommand";
import { registerOpenSidebarCommand } from "../commands/registerOpenSidebarCommand";
import type { ServiceContainer } from "./serviceContainer";

/**
 * Registers extension commands.
 *
 * Why this file exists:
 * - keeps command wiring separate from command implementation
 * - prepares the repo for later service-based command handlers
 *
 * Current phase note:
 * - commands still use the existing implementations
 * - phase 2.4 will start routing them through the new service layer
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  services: ServiceContainer
): void {
  context.subscriptions.push(registerHelloCommand(services.runtime));

  context.subscriptions.push(
    registerInspectWorkspaceSnapshotCommand(services.runtime)
  );

  context.subscriptions.push(
    registerOpenSidebarCommand(services.runtime, services.sidebarProvider)
  );

  context.subscriptions.push(
    registerExplainWorkspaceCommand(services.runtime, services.sidebarProvider)
  );
}
