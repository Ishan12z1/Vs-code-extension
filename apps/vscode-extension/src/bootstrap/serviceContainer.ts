import type { AgentRuntime } from "../agent/runtime/AgentRuntime";
import type { AgentRunService } from "../services/AgentRunService";
import type { HistoryService } from "../services/HistoryService";
import type { SetupInspectionService } from "../services/SetupInspectionService";
import type { ExtensionRuntime } from "../state/runtime";
import type { ControlAgentSidebarProvider } from "../webview/ControlAgentSidebarProvider";

/**
 * Central container for shared extension objects.
 *
 * This keeps shared dependencies explicit and easy to evolve.
 * It is intentionally small and typed.
 */
export interface ServiceContainer {
  /**
   * Low-level extension runtime helpers.
   */
  readonly runtime: ExtensionRuntime;

  /**
   * Main current UI surface.
   */
  readonly sidebarProvider: ControlAgentSidebarProvider;

  /**
   * New local runtime skeleton.
   */
  readonly agentRuntime: AgentRuntime;

  /**
   * Service entrypoint for starting agent runs.
   */
  readonly agentRunService: AgentRunService;

  /**
   * Service entrypoint for reading run history.
   */
  readonly historyService: HistoryService;

  /**
   * Service entrypoint for collecting the current workspace/setup snapshot.
   */
  readonly setupInspectionService: SetupInspectionService;
}
