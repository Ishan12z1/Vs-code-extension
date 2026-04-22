import type { PolicyDecision, SurfaceAction } from "@control-agent/contracts";
import { RiskClassifier } from "./RiskClassifier";
import type { PolicyEvaluationInput } from "./policyTypes";

/**
 * Policy engine that turns risk classification into one concrete decision:
 * - allow
 * - requireApproval
 * - block
 *
 * Why this exists:
 * - the runtime should not hard-code approval rules in random places
 * - all policy decisions should come from one reusable module
 * - later phases can add richer context without changing the overall contract
 */
export class PolicyEngine {
  public constructor(private readonly riskClassifier: RiskClassifier) {}

  /**
   * Evaluate one requested action and return a policy decision.
   *
   * Current phase rules:
   * - unsupported actions are blocked
   * - read-only actions are allowed
   * - low-risk writes are allowed
   * - medium/high-risk writes require approval
   *
   * Honest note:
   * - 6.1 is foundation only
   * - the approval service and runtime pause/resume path come later
   */
  public evaluate(input: PolicyEvaluationInput): PolicyDecision {
    const { action } = input;

    if (!this.isSupportedAction(action)) {
      return {
        outcome: "block",
        riskLevel: "high",
        reason: `Unsupported action "${action.operation}" for surface "${action.surface}".`,
      };
    }

    const classified = this.riskClassifier.classify(input);

    if (this.isReadOnlyOperation(action.operation)) {
      return {
        outcome: "allow",
        riskLevel: classified.riskLevel,
        reason: classified.reason,
      };
    }

    if (classified.riskLevel === "low") {
      return {
        outcome: "allow",
        riskLevel: classified.riskLevel,
        reason: classified.reason,
      };
    }

    return {
      outcome: "requireApproval",
      riskLevel: classified.riskLevel,
      reason: classified.reason,
    };
  }

  /**
   * Decide whether the action shape is one this phase knows how to govern.
   *
   * Why this explicit support matrix matters:
   * - risk classification alone is not enough
   * - unknown actions should be blocked, not merely "high risk"
   */
  private isSupportedAction(action: SurfaceAction): boolean {
    switch (action.surface) {
      case "userSettings":
      case "workspaceSettings":
        return action.operation === "set" || action.operation === "unset";

      case "keybindings":
        return (
          action.operation === "upsertBinding" ||
          action.operation === "removeBinding"
        );

      case "tasksJson":
        return (
          action.operation === "upsertTask" || action.operation === "removeTask"
        );

      case "launchJson":
        return (
          action.operation === "upsertLaunchConfiguration" ||
          action.operation === "removeLaunchConfiguration"
        );

      case "extensionsLifecycle":
        return (
          action.operation === "installExtension" ||
          action.operation === "updateExtension" ||
          action.operation === "enableExtension" ||
          action.operation === "disableExtension" ||
          action.operation === "uninstallExtension"
        );
    }

    return false;
  }

  /**
   * Identify read-only operations that should bypass approval.
   */
  private isReadOnlyOperation(operation: string): boolean {
    return (
      operation === "inspect" ||
      operation === "preview" ||
      operation === "verify"
    );
  }
}
