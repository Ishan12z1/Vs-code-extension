import { z } from "zod";
import { PlannedActionSchema } from "./actions";
import { ApprovalDecisionSchema, ApprovalRequirementSchema } from "./risk";

/**
 * Structured execution plan for configure/repair/guide flows.
 */
export const ExecutionPlanSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  explanation: z.string().min(1),
  requestClass: z.enum(["configure", "repair", "guide"]),
  approval: ApprovalRequirementSchema,
  actions: z.array(PlannedActionSchema).min(1),
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

/**
 * Structured explanation response for explain/inspect flows.
 */
export const ExplanationResponseSchema = z.object({
  id: z.string().min(1),
  requestClass: z.enum(["explain", "inspect", "guide"]),
  title: z.string().min(1),
  explanation: z.string().min(1),
  suggestedNextSteps: z.array(z.string()).default([]),
});

export type ExplanationResponse = z.infer<typeof ExplanationResponseSchema>;

/**
 * Execution status values for one action result.
 *
 * D2 makes this explicit instead of relying only on a boolean success flag.
 */
export const ExecutionResultStatusSchema = z.enum([
  "pending",
  "succeeded",
  "failed",
  "skipped",
]);

export type ExecutionResultStatus = z.infer<typeof ExecutionResultStatusSchema>;

/**
 * Structured execution result for one action.
 *
 * D2 keeps the existing success flag for convenience, but also adds a formal
 * status field and warnings array so later steps do not need to widen this
 * contract again.
 */
export const ExecutionResultSchema = z.object({
  planId: z.string().min(1),
  actionId: z.string().min(1),
  status: ExecutionResultStatusSchema,
  success: z.boolean(),
  message: z.string().min(1),
  changedTargets: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

/**
 * Structured rollback information for reversing one change if needed.
 *
 * D2 keeps snapshotData flexible, but adds createdAt so stored rollback payloads
 * can carry one standard timestamp when needed.
 */
export const RollbackSnapshotSchema = z.object({
  actionId: z.string().min(1),
  target: z.string().min(1),
  snapshotKind: z.string().min(1),
  snapshotData: z.unknown(),
  createdAt: z.string().datetime().optional(),
});

export type RollbackSnapshot = z.infer<typeof RollbackSnapshotSchema>;

/**
 * Durable approval decision record.
 *
 * D2 adds this as a first-class shared contract because approvals are part of
 * the real product flow and later routes should not invent their own shape.
 */
export const ApprovalDecisionRecordSchema = z.object({
  runId: z.string().min(1),
  planId: z.string().min(1),
  decision: ApprovalDecisionSchema,
  decidedAt: z.string().datetime(),
  reason: z.string().min(1).optional(),
});

export type ApprovalDecisionRecord = z.infer<
  typeof ApprovalDecisionRecordSchema
>;
