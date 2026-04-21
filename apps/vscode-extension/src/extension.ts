import * as vscode from "vscode";
import { registerCommands } from "./bootstrap/registerCommands";
import { registerServices } from "./bootstrap/registerServices";
import { registerViews } from "./bootstrap/registerViews";
import { closeSqliteDatabase } from "./persistence/db/sqlite";

/**
 * Extension entry point.
 *
 * Phase switch note:
 * - sql.js bootstrap is async
 * - activate therefore awaits service registration before wiring views/commands
 */
export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  const services = await registerServices(context);

  services.runtime.output.appendLine("Activating VS Code Control Agent...");

  context.subscriptions.push(services.runtime.output);

  /**
   * Ensure the open SQLite connection is flushed and closed when the extension unloads.
   */
  context.subscriptions.push({
    dispose: () => {
      closeSqliteDatabase(services.runtime, services.db);
    },
  });

  registerViews(context, services);
  registerCommands(context, services);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("controlAgent")) {
        return;
      }

      services.runtime.output.appendLine(
        "[sidebar] controlAgent configuration changed"
      );

      void services.sidebarProvider.refreshShellConfiguration(
        "configuration changed"
      );
    })
  );

  services.runtime.output.appendLine("VS Code Control Agent activated.");
}

export function deactivate(): void {
  /**
   * Explicit DB teardown is handled by the subscription registered above.
   */
}
