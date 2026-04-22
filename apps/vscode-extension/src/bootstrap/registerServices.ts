import * as vscode from "vscode";
import { RunCoordinator } from "../agent/orchestration/RunCoordinator";
import { AgentRuntime } from "../agent/runtime/AgentRuntime";
import { RunStateMachine } from "../agent/runtime/RunStateMachine";
import { PolicyEngine } from "../policy/PolicyEngine";
import { RiskClassifier } from "../policy/RiskClassifier";
import { openSqliteDatabase } from "../persistence/db/sqlite";
import { ApprovalRepository } from "../persistence/repositories/ApprovalRepository";
import { CheckpointRepository } from "../persistence/repositories/CheckpointRepository";
import { MarketplaceCacheRepository } from "../persistence/repositories/MarketplaceCacheRepository";
import { RunRepository } from "../persistence/repositories/RunRepository";
import { SnapshotStore } from "../persistence/snapshots/SnapshotStore";
import { AgentRunService } from "../services/AgentRunService";
import { ApprovalService } from "../services/ApprovalService";
import { HistoryService } from "../services/HistoryService";
import { SetupInspectionService } from "../services/SetupInspectionService";
import { createRuntime } from "../state/runtime";
import { ControlAgentSidebarProvider } from "../webview/ControlAgentSidebarProvider";
import type { ServiceContainer } from "./serviceContainer";

/**
 * Creates the shared objects used across the extension.
 *
 * Phase 6.2 change:
 * - approval requests/decisions now have a first-class service layer
 */
export async function registerServices(
  context: vscode.ExtensionContext
): Promise<ServiceContainer> {
  const runtime = createRuntime(context);
  const sidebarProvider = new ControlAgentSidebarProvider(runtime);

  const db = await openSqliteDatabase(runtime);

  const runRepository = new RunRepository(db);
  const approvalRepository = new ApprovalRepository(db);
  const checkpointRepository = new CheckpointRepository(db);
  const marketplaceCacheRepository = new MarketplaceCacheRepository(db);

  const snapshotStore = new SnapshotStore(runtime);

  const runStateMachine = new RunStateMachine();
  const runCoordinator = new RunCoordinator(runStateMachine);
  const agentRuntime = new AgentRuntime(runCoordinator);

  const riskClassifier = new RiskClassifier();
  const policyEngine = new PolicyEngine(riskClassifier);

  const agentRunService = new AgentRunService(agentRuntime, runRepository);
  const approvalService = new ApprovalService(approvalRepository);
  const historyService = new HistoryService(runRepository);
  const setupInspectionService = new SetupInspectionService(runtime);

  return {
    runtime,
    sidebarProvider,
    db,
    agentRuntime,
    riskClassifier,
    policyEngine,
    runRepository,
    approvalRepository,
    checkpointRepository,
    marketplaceCacheRepository,
    snapshotStore,
    agentRunService,
    approvalService,
    historyService,
    setupInspectionService,
  };
}
