import type { ClassifiedRisk, PolicyEvaluationInput } from "./policyTypes";

/**
 * Classifies the risk of one requested action.
 *
 * Important:
 * - this class does NOT decide allow / requireApproval / block
 * - it only classifies risk + explains why
 * - the policy engine turns risk into an actual policy decision
 *
 * Why keep this separate:
 * - risk classification and policy decisions are related, but not identical
 * - the same risk level can map to different decisions later depending on context
 */
export class RiskClassifier {
  /**
   * Classify one action into low / medium / high risk.
   *
   * Current phase rules:
   * - read-only operations are low
   * - user settings writes are low
   * - workspace/config file/keybinding writes are medium
   * - extension uninstall is high
   * - unknown operations are treated as high risk so the policy engine can block them
   */
  public classify(input: PolicyEvaluationInput): ClassifiedRisk {
    const { action } = input;

    /**
     * Read-only operations are low risk by default.
     */
    if (this.isReadOnlyOperation(action.operation)) {
      return {
        riskLevel: "low",
        reason: `Operation "${action.operation}" is read-only.`,
      };
    }

    switch (action.surface) {
      case "userSettings":
        if (action.operation === "set" || action.operation === "unset") {
          return {
            riskLevel: "low",
            reason:
              "User settings mutation is scoped to the user's configuration and is treated as low risk in V1.",
          };
        }
        break;

      case "workspaceSettings":
        if (action.operation === "set" || action.operation === "unset") {
          return {
            riskLevel: "medium",
            reason:
              "Workspace settings changes affect project behavior and require a more cautious policy path.",
          };
        }
        break;

      case "keybindings":
        if (
          action.operation === "upsertBinding" ||
          action.operation === "removeBinding"
        ) {
          return {
            riskLevel: "medium",
            reason:
              "Keybinding changes affect editor interaction and should be treated as medium risk.",
          };
        }
        break;

      case "tasksJson":
        if (
          action.operation === "upsertTask" ||
          action.operation === "removeTask"
        ) {
          return {
            riskLevel: "medium",
            reason:
              "tasks.json changes affect workspace automation and should be treated as medium risk.",
          };
        }
        break;

      case "launchJson":
        if (
          action.operation === "upsertLaunchConfiguration" ||
          action.operation === "removeLaunchConfiguration"
        ) {
          return {
            riskLevel: "medium",
            reason:
              "launch.json changes affect debugging behavior and should be treated as medium risk.",
          };
        }
        break;

      case "extensionsLifecycle":
        if (
          action.operation === "installExtension" ||
          action.operation === "updateExtension" ||
          action.operation === "enableExtension" ||
          action.operation === "disableExtension"
        ) {
          return {
            riskLevel: "medium",
            reason:
              "Extension lifecycle changes can materially affect editor behavior and are treated as medium risk.",
          };
        }

        if (action.operation === "uninstallExtension") {
          return {
            riskLevel: "high",
            reason:
              "Uninstalling an extension can remove functionality and is treated as high risk.",
          };
        }
        break;
    }

    /**
     * Unknown operations are classified as high risk.
     *
     * Why:
     * - this lets the policy engine reject unsupported action shapes explicitly
     * - fail-closed is safer than pretending an unknown action is low risk
     */
    return {
      riskLevel: "high",
      reason: `Unsupported or unknown action "${action.operation}" for surface "${action.surface}".`,
    };
  }

  /**
   * Identify operations that are effectively read-only.
   *
   * These are not yet first-class adapter operations everywhere,
   * but the policy layer should be ready for them.
   */
  private isReadOnlyOperation(operation: string): boolean {
    return (
      operation === "inspect" ||
      operation === "preview" ||
      operation === "verify"
    );
  }
}
