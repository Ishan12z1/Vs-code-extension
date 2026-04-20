import type { AgentRunState, RunHistoryEntry } from "@control-agent/contracts";

/**
 * Placeholder history service.
 *
 * Why this exists now:
 * - commands/UI will soon need a stable service interface for run history
 * - persistence does not exist yet, so we return mock/derived data for now
 *
 * Later phases will replace this with real local persistence.
 */
export class HistoryService {
  /**
   * Return the recent run history.
   *
   * Current phase note:
   * - returns an empty list because persistence is not built yet
   */
  public listRecentRuns(): RunHistoryEntry[] {
    return [];
  }

  /**
   * Convert an in-memory run state into a lightweight history entry.
   *
   * This helper is useful even before persistence exists because it defines
   * what a history summary should look like.
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
