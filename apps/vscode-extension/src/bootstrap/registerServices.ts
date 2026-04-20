import * as vscode from "vscode";
import { RunCoordinator } from "../agent/orchestration/RunCoordinator";
import { AgentRuntime } from "../agent/runtime/AgentRuntime";
import { RunStateMachine } from "../agent/runtime/RunStateMachine";
import { AgentRunService } from "../services/AgentRunService";
import { HistoryService } from "../services/HistoryService";
import { SetupInspectionService } from "../services/SetupInspectionService";
import { createRuntime } from "../state/runtime";
import { ControlAgentSidebarProvider } from "../webview/ControlAgentSidebarProvider";
import type { ServiceContainer } from "./serviceContainer";

/**
 * Creates the shared objects used across the extension.
 *
 * Phase 2.4 note:
 * - commands now depend on services instead of doing work directly
 * - we therefore register SetupInspectionService alongside AgentRunService
 */
export function registerServices(
  context: vscode.ExtensionContext
): ServiceContainer {
  const runtime = createRuntime(context);

  /**
   * Existing sidebar UI surface.
   */
  const sidebarProvider = new ControlAgentSidebarProvider(runtime);

  /**
   * Local runtime skeleton.
   *
   * Construction order stays explicit so the dependency graph remains readable.
   */
  const runStateMachine = new RunStateMachine();
  const runCoordinator = new RunCoordinator(runStateMachine);
  const agentRuntime = new AgentRuntime(runCoordinator);

  /**
   * Placeholder service layer.
   *
   * These services become the main API used by command handlers.
   */
  const agentRunService = new AgentRunService(agentRuntime);
  const historyService = new HistoryService();
  const setupInspectionService = new SetupInspectionService(runtime);

  return {
    runtime,
    sidebarProvider,
    agentRuntime,
    agentRunService,
    historyService,
    setupInspectionService,
  };
}
