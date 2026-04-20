import { z } from "zod";

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);

export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const ApprovalDecisionSchema = z.enum([
  "approved",
  "rejected",
  "cancelled",
]);

export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export const ApprovalRequestSchema = z.object({
  requestId: z.string().min(1),
  runId: z.string().min(1),
  toolName: z.string().min(1),
  targetLabel: z.string().min(1),
  riskLevel: RiskLevelSchema,
  reason: z.string().min(1),
  previewSummary: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
});

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

export const ApprovalDecisionRecordSchema = z.object({
  requestId: z.string().min(1),
  runId: z.string().min(1),
  decision: ApprovalDecisionSchema,
  reason: z.string().min(1).optional(),
  decidedAt: z.string().datetime(),
});

export type ApprovalDecisionRecord = z.infer<
  typeof ApprovalDecisionRecordSchema
>;

export const PolicyDecisionSchema = z.object({
  outcome: z.enum(["allow", "requireApproval", "block"]),
  riskLevel: RiskLevelSchema,
  reason: z.string().min(1),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
