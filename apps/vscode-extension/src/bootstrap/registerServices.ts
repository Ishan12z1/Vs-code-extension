import * as vscode from "vscode";
import { RunCoordinator } from "../agent/orchestration/RunCoordinator";
import { AgentRuntime } from "../agent/runtime/AgentRuntime";
import { RunStateMachine } from "../agent/runtime/RunStateMachine";
import { AgentRunService } from "../services/AgentRunService";
import { HistoryService } from "../services/HistoryService";
import { createRuntime } from "../state/runtime";
import { ControlAgentSidebarProvider } from "../webview/ControlAgentSidebarProvider";
import type { ServiceContainer } from "./serviceContainer";

/**
 * Creates the shared objects used across the extension.
 *
 * Phase 2.3 change:
 * - we now create the first local runtime skeleton
 * - we also expose placeholder services through the container
 *
 * Important:
 * - this is still not the full runtime
 * - persistence, approvals, verification, and real step execution come later
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
   * New local runtime skeleton.
   *
   * Construction order is explicit so the dependency graph stays readable:
   * state machine -> coordinator -> runtime -> services
   */
  const runStateMachine = new RunStateMachine();
  const runCoordinator = new RunCoordinator(runStateMachine);
  const agentRuntime = new AgentRuntime(runCoordinator);

  /**
   * Placeholder services used by commands/UI later.
   */
  const agentRunService = new AgentRunService(agentRuntime);
  const historyService = new HistoryService();

  return {
    runtime,
    sidebarProvider,
    agentRuntime,
    agentRunService,
    historyService,
  };
}
