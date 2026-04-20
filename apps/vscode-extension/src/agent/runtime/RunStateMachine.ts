import type {
  AgentGoal,
  AgentRunState,
  RunStatus,
} from "@control-agent/contracts";

/**
 * Small helper for creating and evolving run state.
 *
 * Why this exists:
 * - keeps run-state creation rules in one place
 * - prevents random ad hoc state objects from spreading across the repo
 * - prepares the codebase for a real bounded runtime loop later
 *
 * Current phase note:
 * - this is intentionally small
 * - later phases will add richer transitions and validation
 */
export class RunStateMachine {
  /**
   * Create the initial state for one new agent run.
   */
  public createInitialState(goal: AgentGoal, maxSteps = 10): AgentRunState {
    const now = new Date().toISOString();

    return {
      runId: `run-${Date.now()}`,
      goal,
      status: "idle",
      currentStep: 0,
      maxSteps,
      context: {},
      history: [],
      approvals: [],
      checkpoints: [],
      snapshots: [],
      startedAt: now,
      updatedAt: now,
    };
  }

  /**
   * Return a new state object with an updated status.
   *
   * Why immutable update:
   * - makes transitions easier to reason about
   * - avoids hidden mutations while the runtime is still simple
   */
  public updateStatus(state: AgentRunState, status: RunStatus): AgentRunState {
    return {
      ...state,
      status,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Advance the current step counter by one.
   */
  public advanceStep(state: AgentRunState): AgentRunState {
    return {
      ...state,
      currentStep: state.currentStep + 1,
      updatedAt: new Date().toISOString(),
    };
  }
}
