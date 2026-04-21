import type { AgentRunState, RunHistoryEntry } from "@control-agent/contracts";
import { RunRepository } from "../persistence/repositories/RunRepository";

/**
 * History service backed by the run repository.
 *
 * Phase 3.3 change:
 * - history is no longer a hard-coded empty list
 * - it now reads durable run metadata from SQLite
 */
export class HistoryService {
  public constructor(private readonly runRepository: RunRepository) {}

  /**
   * Return recent persisted runs.
   */
  public listRecentRuns(limit = 20): RunHistoryEntry[] {
    return this.runRepository.listRecentRuns(limit);
  }

  /**
   * Convert an in-memory run state into a lightweight history entry.
   *
   * This helper still has value for places that derive UI state before writes.
   */
  public toHistoryEntry(state: AgentRunState): RunHistoryEntry {
    return {
      runId: state.runId,
      goalText: state.goal.text,
      status: state.status,
      stepCount: state.currentStep,
      approvalCount: state.approvals.length,
      startedAt: state.startedAt,
      completedAt:
        state.status === "completed" ||
        state.status === "failed" ||
        state.status === "cancelled"
          ? state.updatedAt
          : undefined,
      summary: state.finalSummary?.summary,
    };
  }
}
