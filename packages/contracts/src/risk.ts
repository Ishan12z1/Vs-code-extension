import { z } from "zod";

/**
 * Shared risk levels used across planning and approval logic.
 */
export const RiskLevelSchema = z.enum(["low", "medium", "high"]);

export type RiskLevel = z.infer<typeof RiskLevelSchema>;

/**
 * Approval requirement shown before a plan can be applied.
 */
export const ApprovalRequirementSchema = z.object({
  required: z.boolean(),
  reason: z.string().min(1),
  riskLevel: RiskLevelSchema,
});

export type ApprovalRequirement = z.infer<typeof ApprovalRequirementSchema>;

/**
 * First-class approval decision values.
 *
 * D2 adds this explicitly so approval-related flows do not invent ad hoc strings
 * later in the backend or extension.
 */
export const ApprovalDecisionSchema = z.enum([
  "approved",
  "rejected",
  "cancelled",
]);

export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;
