import type { AgentRuntime } from "../agent/runtime/AgentRuntime";
import type { PolicyEngine } from "../policy/PolicyEngine";
import type { RiskClassifier } from "../policy/RiskClassifier";
import type { SqliteDatabase } from "../persistence/db/sqlite";
import type { ApprovalRepository } from "../persistence/repositories/ApprovalRepository";
import type { CheckpointRepository } from "../persistence/repositories/CheckpointRepository";
import type { MarketplaceCacheRepository } from "../persistence/repositories/MarketplaceCacheRepository";
import type { RunRepository } from "../persistence/repositories/RunRepository";
import type { SnapshotStore } from "../persistence/snapshots/SnapshotStore";
import type { AgentRunService } from "../services/AgentRunService";
import type { HistoryService } from "../services/HistoryService";
import type { SetupInspectionService } from "../services/SetupInspectionService";
import type { ExtensionRuntime } from "../state/runtime";
import type { ControlAgentSidebarProvider } from "../webview/ControlAgentSidebarProvider";

/**
 * Central container for shared extension objects.
 */
export interface ServiceContainer {
  readonly runtime: ExtensionRuntime;
  readonly sidebarProvider: ControlAgentSidebarProvider;
  readonly db: SqliteDatabase;
  readonly agentRuntime: AgentRuntime;

  /**
   * Policy core added in phase 6.1.
   */
  readonly riskClassifier: RiskClassifier;
  readonly policyEngine: PolicyEngine;

  readonly runRepository: RunRepository;
  readonly approvalRepository: ApprovalRepository;
  readonly checkpointRepository: CheckpointRepository;
  readonly marketplaceCacheRepository: MarketplaceCacheRepository;
  readonly snapshotStore: SnapshotStore;

  readonly agentRunService: AgentRunService;
  readonly historyService: HistoryService;
  readonly setupInspectionService: SetupInspectionService;
}
