import type { AgentGoal, AgentRunState } from "@control-agent/contracts";
import { RunStateMachine } from "../runtime/RunStateMachine";

/**
 * Coordinates one agent run at a high level.
 *
 * Why this exists:
 * - separates orchestration intent from low-level state transitions
 * - gives later phases one place to add approvals, checkpoints,
 *   verification, retry policy, and stop conditions
 *
 * Current phase note:
 * - this coordinator is deliberately minimal
 * - it only creates a new run and marks it as running
 */
export class RunCoordinator {
  public constructor(private readonly stateMachine: RunStateMachine) {}

  /**
   * Start a new run from a user goal.
   */
  public start(goal: AgentGoal): AgentRunState {
    const initialState = this.stateMachine.createInitialState(goal);

    return this.stateMachine.updateStatus(initialState, "running");
  }
}
