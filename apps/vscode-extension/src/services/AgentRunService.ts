import type { AgentGoal, AgentRunState } from "@control-agent/contracts";
import { AgentRuntime } from "../agent/runtime/AgentRuntime";

/**
 * Application-facing service for starting agent runs.
 *
 * Why this exists:
 * - commands and UI should not talk directly to AgentRuntime
 * - this gives us a clean service layer boundary
 * - later phases can add persistence, history writes, validation,
 *   and approval coordination here
 *
 * Current phase note:
 * - this is a thin wrapper around AgentRuntime
 */
export class AgentRunService {
  public constructor(private readonly agentRuntime: AgentRuntime) {}

  /**
   * Start a run from plain user text.
   *
   * Why convert text to a goal here:
   * - keeps commands thinner
   * - keeps the runtime focused on run orchestration, not UI input shaping
   */
  public startGoal(goalText: string): AgentRunState {
    const goal: AgentGoal = {
      id: `goal-${Date.now()}`,
      text: goalText,
      createdAt: new Date().toISOString(),
    };

    return this.agentRuntime.startRun(goal);
  }
}
