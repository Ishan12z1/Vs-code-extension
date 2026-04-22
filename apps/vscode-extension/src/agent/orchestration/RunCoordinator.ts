import type {
  ActionPreview,
  AgentGoal,
  AgentRunState,
  SurfaceAction,
} from "@control-agent/contracts";
import { PolicyEngine } from "../../policy/PolicyEngine";
import { ApprovalService } from "../../services/ApprovalService";
import { RunStateMachine } from "../runtime/RunStateMachine";

/**
 * Coordinates one agent run at a high level.
 *
 * Phase 6.3 change:
 * - the coordinator now performs the first real runtime policy gate
 * - actions no longer jump directly to execution in principle
 * - the runtime can now land in:
 *   - running
 *   - waitingApproval
 *   - blocked
 *
 * Important:
 * - this is still not the full tool loop
 * - it is the first real enforcement point for policy decisions
 */
export class RunCoordinator {
  public constructor(
    private readonly stateMachine: RunStateMachine,
    private readonly policyEngine: PolicyEngine,
    private readonly approvalService: ApprovalService
  ) {}

  /**
   * Start a new run from a user goal.
   *
   * This remains the plain run bootstrap path.
   */
  public start(goal: AgentGoal): AgentRunState {
    const initialState = this.stateMachine.createInitialState(goal);

    return this.stateMachine.updateStatus(initialState, "running");
  }

  /**
   * Start a run and immediately evaluate one candidate action through policy.
   *
   * Why this method exists:
   * - phase 6.3 needs one real runtime hook for policy
   * - later phases can replace this with a richer multi-step loop
   */
  public startWithAction(
    goal: AgentGoal,
    action: SurfaceAction,
    preview?: ActionPreview
  ): AgentRunState {
    let state = this.start(goal);

    const decision = this.policyEngine.evaluate({
      action,
      preview,
    });

    /**
     * Case 1: the action is allowed.
     *
     * We do not apply the action yet here because:
     * - the full tool execution loop is still a later phase
     * - 6.3 only introduces policy enforcement in the runtime path
     */
    if (decision.outcome === "allow") {
      state = this.stateMachine.advanceStep(state);

      state = this.stateMachine.mergeContext(state, {
        lastPolicyOutcome: decision.outcome,
        lastPolicyReason: decision.reason,
        lastRiskLevel: decision.riskLevel,
        lastAction: action,
      });

      state = this.stateMachine.addCheckpoint(
        state,
        this.stateMachine.createCheckpoint(state, {
          status: "running",
          activeSurface: action.surface,
          note: `Policy allowed action "${action.operation}" on "${action.target}".`,
          context: {
            policyOutcome: decision.outcome,
            riskLevel: decision.riskLevel,
            reason: decision.reason,
          },
        })
      );

      return state;
    }

    /**
     * Case 2: the action requires approval.
     *
     * We create and persist an approval request, then park the run in
     * waitingApproval.
     */
    if (decision.outcome === "requireApproval") {
      const approvalRequest = this.approvalService.createApprovalRequest({
        runId: state.runId,
        action,
        riskLevel: decision.riskLevel,
        reason: decision.reason,
        preview,
      });

      state = this.stateMachine.updateStatus(state, "waitingApproval");

      state = this.stateMachine.mergeContext(state, {
        lastPolicyOutcome: decision.outcome,
        lastPolicyReason: decision.reason,
        lastRiskLevel: decision.riskLevel,
        pendingApprovalRequestId: approvalRequest.requestId,
        pendingAction: action,
      });

      state = this.stateMachine.addCheckpoint(
        state,
        this.stateMachine.createCheckpoint(state, {
          status: "waitingApproval",
          activeSurface: action.surface,
          note: `Approval required for action "${action.operation}" on "${action.target}".`,
          context: {
            approvalRequestId: approvalRequest.requestId,
            policyOutcome: decision.outcome,
            riskLevel: decision.riskLevel,
            reason: decision.reason,
          },
        })
      );

      return state;
    }

    /**
     * Case 3: the action is blocked entirely.
     */
    state = this.stateMachine.updateStatus(state, "blocked");

    state = this.stateMachine.mergeContext(state, {
      lastPolicyOutcome: decision.outcome,
      lastPolicyReason: decision.reason,
      lastRiskLevel: decision.riskLevel,
      blockedAction: action,
    });

    state = this.stateMachine.addCheckpoint(
      state,
      this.stateMachine.createCheckpoint(state, {
        status: "blocked",
        activeSurface: action.surface,
        note: `Policy blocked action "${action.operation}" on "${action.target}".`,
        context: {
          policyOutcome: decision.outcome,
          riskLevel: decision.riskLevel,
          reason: decision.reason,
        },
      })
    );

    return state;
  }
}
