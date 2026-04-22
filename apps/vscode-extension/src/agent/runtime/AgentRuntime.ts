import type {
  ActionPreview,
  AgentGoal,
  AgentRunState,
  SurfaceAction,
} from "@control-agent/contracts";
import { RunCoordinator } from "../orchestration/RunCoordinator";

/**
 * Local agent runtime skeleton.
 *
 * Phase 6.3 change:
 * - the runtime can now start a run through the policy gate
 * - this is the first real policy-aware runtime behavior
 */
export class AgentRuntime {
  public constructor(private readonly runCoordinator: RunCoordinator) {}

  /**
   * Start a new local agent run without an immediate action.
   */
  public startRun(goal: AgentGoal): AgentRunState {
    return this.runCoordinator.start(goal);
  }

  /**
   * Start a new local run and immediately policy-check one action.
   *
   * Why this exists:
   * - gives the current runtime one real enforcement path
   * - later phases can replace this with a richer action loop
   */
  public startRunWithAction(
    goal: AgentGoal,
    action: SurfaceAction,
    preview?: ActionPreview
  ): AgentRunState {
    return this.runCoordinator.startWithAction(goal, action, preview);
  }
}
