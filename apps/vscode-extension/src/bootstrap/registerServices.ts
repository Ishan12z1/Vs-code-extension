import * as vscode from "vscode";
import { RunCoordinator } from "../agent/orchestration/RunCoordinator";
import { AgentRuntime } from "../agent/runtime/AgentRuntime";
import { RunStateMachine } from "../agent/runtime/RunStateMachine";
import { openSqliteDatabase } from "../persistence/db/sqlite";
import { ApprovalRepository } from "../persistence/repositories/ApprovalRepository";
import { CheckpointRepository } from "../persistence/repositories/CheckpointRepository";
import { MarketplaceCacheRepository } from "../persistence/repositories/MarketplaceCacheRepository";
import { RunRepository } from "../persistence/repositories/RunRepository";
import { AgentRunService } from "../services/AgentRunService";
import { HistoryService } from "../services/HistoryService";
import { SetupInspectionService } from "../services/SetupInspectionService";
import { createRuntime } from "../state/runtime";
import { ControlAgentSidebarProvider } from "../webview/ControlAgentSidebarProvider";
import type { ServiceContainer } from "./serviceContainer";

/**
 * Creates the shared objects used across the extension.
 *
 * Phase 3.3 change:
 * - SQLite is now opened during service registration
 * - repositories are constructed here
 * - services start depending on repositories instead of mock-only behavior
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
   * Open the durable local SQLite database.
   */
  const db = openSqliteDatabase(runtime);

  /**
   * Repository layer over the SQLite schema.
   */
  const runRepository = new RunRepository(db);
  const approvalRepository = new ApprovalRepository(db);
  const checkpointRepository = new CheckpointRepository(db);
  const marketplaceCacheRepository = new MarketplaceCacheRepository(db);

  /**
   * Local runtime skeleton.
   */
  const runStateMachine = new RunStateMachine();
  const runCoordinator = new RunCoordinator(runStateMachine);
  const agentRuntime = new AgentRuntime(runCoordinator);

  /**
   * Application-facing services.
   */
  const agentRunService = new AgentRunService(agentRuntime, runRepository);
  const historyService = new HistoryService(runRepository);
  const setupInspectionService = new SetupInspectionService(runtime);

  return {
    runtime,
    sidebarProvider,
    db,
    agentRuntime,
    runRepository,
    approvalRepository,
    checkpointRepository,
    marketplaceCacheRepository,
    agentRunService,
    historyService,
    setupInspectionService,
  };
}
