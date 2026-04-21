import * as vscode from "vscode";
import { registerCommands } from "./bootstrap/registerCommands";
import { registerServices } from "./bootstrap/registerServices";
import { registerViews } from "./bootstrap/registerViews";
import { closeSqliteDatabase } from "./persistence/db/sqlite";

/**
 * Extension entry point.
 *
 * Phase 3.3 change:
 * - the SQLite database is now opened through registerServices
 * - extension shutdown now closes the DB handle explicitly
 */
export function activate(context: vscode.ExtensionContext): void {
  const services = registerServices(context);

  services.runtime.output.appendLine("Activating VS Code Control Agent...");

  /**
   * The shared output channel is a disposable resource and must be tied
   * to the extension lifecycle.
   */
  context.subscriptions.push(services.runtime.output);

  /**
   * Ensure the open SQLite connection is closed when the extension unloads.
   */
  context.subscriptions.push({
    dispose: () => {
      closeSqliteDatabase(services.runtime, services.db);
    },
  });

  /**
   * Register all extension surfaces through dedicated bootstrap functions.
   */
  registerViews(context, services);
  registerCommands(context, services);

  /**
   * Keep the visible shell configuration in sync while the old sidebar-based
   * flow still exists. This remains transitional until later phases move more
   * behavior into the local runtime/service path.
   */
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
