import type {
  AgentGoal,
  AgentRunState,
  RunCheckpoint,
  RunStatus,
} from "@control-agent/contracts";

/**
 * Small helper for creating and evolving run state.
 *
 * Phase 6.3 change:
 * - the state machine now helps create checkpoints
 * - the state machine can also merge runtime context updates
 *
 * Why this matters:
 * - policy integration should not create ad hoc state objects all over the runtime
 * - checkpoints and context updates should follow one consistent shape
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

  /**
   * Merge arbitrary runtime context values into the run state.
   *
   * Why this exists:
   * - the runtime needs somewhere to store policy/approval breadcrumbs
   * - keeping this immutable prevents hidden mutation bugs
   */
  public mergeContext(
    state: AgentRunState,
    patch: Record<string, unknown>
  ): AgentRunState {
    return {
      ...state,
      context: {
        ...state.context,
        ...patch,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Create one checkpoint object for the current run.
   *
   * Why this exists:
   * - the runtime should record durable policy/approval milestones
   * - later phases will persist these checkpoints through the repository layer
   */
  public createCheckpoint(
    state: AgentRunState,
    input: {
      status: RunStatus;
      note: string;
      activeSurface?: AgentRunState["activeSurface"];
      context?: Record<string, unknown>;
    }
  ): RunCheckpoint {
    return {
      checkpointId: `checkpoint-${Date.now()}-${state.checkpoints.length + 1}`,
      runId: state.runId,
      stepIndex: state.currentStep,
      status: input.status,
      activeSurface: input.activeSurface,
      note: input.note,
      context: input.context ?? {},
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Append one checkpoint to the run state.
   */
  public addCheckpoint(
    state: AgentRunState,
    checkpoint: RunCheckpoint
  ): AgentRunState {
    return {
      ...state,
      checkpoints: [...state.checkpoints, checkpoint],
      updatedAt: new Date().toISOString(),
    };
  }
}
