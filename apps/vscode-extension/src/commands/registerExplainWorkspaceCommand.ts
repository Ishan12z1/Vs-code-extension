import * as vscode from "vscode";
import type { AgentRunService } from "../services/AgentRunService";
import type { ExtensionRuntime } from "../state/runtime";

/**
 * User-facing explain command.
 *
 * Phase 2.4 change:
 * - the command no longer routes directly into the old sidebar/provider flow
 * - it now starts a local run through AgentRunService
 *
 * Current phase note:
 * - this is still a placeholder local run
 * - later phases will connect the full runtime loop and UI state updates
 */
export function registerExplainWorkspaceCommand(
  runtime: ExtensionRuntime,
  agentRunService: AgentRunService
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "controlAgent.explainWorkspace",
    async () => {
      /**
       * Keep the sidebar visible because it is still the main user surface.
       * The difference is that the command no longer asks the sidebar provider
       * to orchestrate the explain flow directly.
       */
      await vscode.commands.executeCommand("controlAgent.openSidebar");

      const runState = agentRunService.startGoal(
        "Explain my current VS Code setup"
      );

      runtime.output.appendLine(
        `[explain] local run started: ${runState.runId} (${runState.status})`
      );

      await vscode.window.showInformationMessage(
        "Started a local explain run. Check the output panel for the current placeholder state."
      );
    }
  );
}
