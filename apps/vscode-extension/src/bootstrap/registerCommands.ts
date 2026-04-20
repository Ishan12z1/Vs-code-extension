import * as vscode from "vscode";
import { registerExplainWorkspaceCommand } from "../commands/registerExplainWorkspaceCommand";
import { registerHelloCommand } from "../commands/registerHelloCommand";
import { registerInspectWorkspaceSnapshotCommand } from "../commands/registerInspectWorkspaceSnapshotCommand";
import { registerOpenSidebarCommand } from "../commands/registerOpenSidebarCommand";
import type { ServiceContainer } from "./serviceContainer";

/**
 * Registers extension commands.
 *
 * Phase 2.4 change:
 * - command handlers are now wired against services where appropriate
 * - command implementations should stay thin and orchestration-free
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  services: ServiceContainer
): void {
  context.subscriptions.push(registerHelloCommand(services.runtime));

  context.subscriptions.push(
    registerInspectWorkspaceSnapshotCommand(
      services.runtime,
      services.setupInspectionService
    )
  );

  context.subscriptions.push(
    registerOpenSidebarCommand(services.runtime, services.sidebarProvider)
  );

  context.subscriptions.push(
    registerExplainWorkspaceCommand(services.runtime, services.agentRunService)
  );
}
