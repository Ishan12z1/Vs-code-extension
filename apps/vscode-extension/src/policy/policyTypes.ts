import type {
  ActionPreview,
  RiskLevel,
  SurfaceAction,
} from "@control-agent/contracts";

/**
 * Input passed into the policy layer.
 *
 * Why this exists:
 * - policy decisions should not depend only on the raw action forever
 * - later phases may include preview details, actor identity, or run context
 * - keeping one explicit input shape now prevents ad hoc method growth later
 */
export interface PolicyEvaluationInput {
  /**
   * The requested surface mutation or operation being evaluated.
   */
  readonly action: SurfaceAction;

  /**
   * Optional human-readable preview.
   *
   * Not required in 6.1, but included now because:
   * - approval flows will often want preview context
   * - some future rules may inspect the preview details
   */
  readonly preview?: ActionPreview;
}

/**
 * Result returned by the risk classifier before the policy engine
 * turns it into allow / requireApproval / block.
 */
export interface ClassifiedRisk {
  readonly riskLevel: RiskLevel;
  readonly reason: string;
}
