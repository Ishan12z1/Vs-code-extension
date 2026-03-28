import {z} from "zod";
import { PlannedActionSchema} from "./actions";
import { ApprovalRequirementSchema } from "./risk";

/*schmea for execution type action */
export const ExecutionPlanSchema=z.object({
    id:z.string().min(1),
    summary:z.string().min(1),
    explanation:z.string().min(1),
    requestClass: z.enum(["configure", "repair", "guide"]),
    approval:ApprovalRequirementSchema,
    actions:z.array(PlannedActionSchema).min(1)

});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
/*schema for explain type of response*/
export const ExplanationResponseSchema=z.object({
    id:z.string().min(1),
    requestClass:z.enum(["explain","inspect","guide"]),
    title:z.string().min(1),
    explanation:z.string().min(1),
    suggestedNextSteps:z.array(z.string()).default([])

});

export type ExplanationResponse = z.infer<typeof ExplanationResponseSchema>;


/* This is the schema for execution result */
export const ExecutionResultSchema = z.object({
  planId: z.string().min(1),
  actionId: z.string().min(1),
  success: z.boolean(),
  message: z.string().min(1),
  changedTargets: z.array(z.string()).default([])
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

/*Schema for rollback information for reversing a change if needed */
export const RollbackSnapshotSchema = z.object({
  actionId: z.string().min(1),
  target: z.string().min(1),
  snapshotKind: z.string().min(1),
  snapshotData: z.unknown()
});

export type RollbackSnapshot = z.infer<typeof RollbackSnapshotSchema>;