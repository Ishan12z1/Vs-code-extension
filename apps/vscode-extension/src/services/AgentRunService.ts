import type { AgentGoal, AgentRunState } from "@control-agent/contracts";
import { AgentRuntime } from "../agent/runtime/AgentRuntime";
import { RunRepository } from "../persistence/repositories/RunRepository";

/**
 * Application-facing service for starting agent runs.
 *
 * Phase 3.3 change:
 * - starting a run now also persists durable run metadata
 */
export class AgentRunService {
  public constructor(
    private readonly agentRuntime: AgentRuntime,
    private readonly runRepository: RunRepository
  ) {}

  /**
   * Start a run from plain user text and persist the initial run state.
   */
  public startGoal(goalText: string): AgentRunState {
    const goal: AgentGoal = {
      id: `goal-${Date.now()}`,
      text: goalText,
      createdAt: new Date().toISOString(),
    };

    const runState = this.agentRuntime.startRun(goal);

    /**
     * Persist the new run immediately so local history becomes durable.
     */
    this.runRepository.upsertRun(runState);

    return runState;
  }
}
