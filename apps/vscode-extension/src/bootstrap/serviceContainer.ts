import type { AgentRuntime } from "../agent/runtime/AgentRuntime";
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

  /**
   * Open SQLite handle for the extension lifecycle.
   */
  readonly db: SqliteDatabase;

  /**
   * Local runtime skeleton.
   */
  readonly agentRuntime: AgentRuntime;

  /**
   * Repositories over the current SQLite schema.
   */
  readonly runRepository: RunRepository;
  readonly approvalRepository: ApprovalRepository;
  readonly checkpointRepository: CheckpointRepository;
  readonly marketplaceCacheRepository: MarketplaceCacheRepository;

  /**
   * File-based snapshot persistence.
   */
  readonly snapshotStore: SnapshotStore;

  /**
   * Application-facing services.
   */
  readonly agentRunService: AgentRunService;
  readonly historyService: HistoryService;
  readonly setupInspectionService: SetupInspectionService;
}
