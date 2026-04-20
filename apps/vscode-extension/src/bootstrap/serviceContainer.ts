import type { AgentRuntime } from "../agent/runtime/AgentRuntime";
import type { AgentRunService } from "../services/AgentRunService";
import type { HistoryService } from "../services/HistoryService";
import type { ExtensionRuntime } from "../state/runtime";
import type { ControlAgentSidebarProvider } from "../webview/ControlAgentSidebarProvider";

/**
 * Central container for shared extension objects.
 *
 * This grows over time as the local-first runtime is introduced.
 * It is intentionally simple and explicit.
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
   * Service entrypoint for starting runs.
   */
  readonly agentRunService: AgentRunService;

  /**
   * Service entrypoint for history reads.
   */
  readonly historyService: HistoryService;
}
