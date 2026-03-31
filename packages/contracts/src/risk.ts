import { z } from "zod";

/**
 * This defines the type fo risk levels for an action
 */
export const RiskLevelSchema = z.enum(["low", "medium", "high"]);

export type RiskLevel = z.infer<typeof RiskLevelSchema>;

/**
 * This defines the approval requirements schema to ask user
 */
export const ApprovalRequirementSchema = z.object({
  required: z.boolean(),
  reason: z.string().min(1),
  riskLevel: RiskLevelSchema,
});

export type ApprovalRequirement = z.infer<typeof ApprovalRequirementSchema>;
