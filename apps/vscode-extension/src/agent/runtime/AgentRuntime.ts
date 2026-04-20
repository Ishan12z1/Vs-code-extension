import type { AgentGoal, AgentRunState } from "@control-agent/contracts";
import { RunCoordinator } from "../orchestration/RunCoordinator";

/**
 * Local agent runtime skeleton.
 *
 * This class will later own the bounded autonomous loop:
 * - inspect context
 * - choose next tool
 * - run policy check
 * - execute one step
 * - verify
 * - continue / stop / wait for approval
 *
 * Current phase note:
 * - no real loop yet
 * - this only starts a run through RunCoordinator
 */
export class AgentRuntime {
  public constructor(private readonly runCoordinator: RunCoordinator) {}

  /**
   * Start a new local agent run.
   *
   * Later this method will become the entrypoint into the full stepwise loop.
   */
  public startRun(goal: AgentGoal): AgentRunState {
    return this.runCoordinator.start(goal);
  }
}
