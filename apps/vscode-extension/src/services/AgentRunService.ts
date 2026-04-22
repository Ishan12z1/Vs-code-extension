import type {
  ActionPreview,
  AgentGoal,
  AgentRunState,
  SurfaceAction,
} from "@control-agent/contracts";
import { AgentRuntime } from "../agent/runtime/AgentRuntime";
import { RunRepository } from "../persistence/repositories/RunRepository";

/**
 * Application-facing service for starting agent runs.
 *
 * Phase 6.3 change:
 * - this service can now start a run through the policy gate for one action
 * - the resulting run state is persisted immediately
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

    this.runRepository.upsertRun(runState);

    return runState;
  }

  /**
   * Start a run and immediately evaluate one action through policy.
   *
   * Why this exists:
   * - gives commands/runtime integration one real policy-aware entrypoint
   * - later tool-loop code can call into this same structure
   */
  public startGoalWithAction(
    goalText: string,
    action: SurfaceAction,
    preview?: ActionPreview
  ): AgentRunState {
    const goal: AgentGoal = {
      id: `goal-${Date.now()}`,
      text: goalText,
      createdAt: new Date().toISOString(),
    };

    const runState = this.agentRuntime.startRunWithAction(
      goal,
      action,
      preview
    );

    /**
     * Persist immediately so:
     * - waitingApproval runs are durable
     * - blocked runs are durable
     * - allowed runs have policy checkpoints recorded in storage later
     */
    this.runRepository.upsertRun(runState);

    return runState;
  }
}
