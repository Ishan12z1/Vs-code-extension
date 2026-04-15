import { z } from "zod";
import {
  ApprovalDecisionRecordSchema,
  ExecutionPlanSchema,
  ExplanationResponseSchema,
} from "./plan";
import { ApprovalDecisionSchema } from "./risk";
import { UserRequestSchema, WorkspaceSnapshotSchema } from "./requests";

/**
 * Planner API input:
 * - what the user wants
 * - what the workspace looks like
 */
export const PlanRequestSchema = z.strictObject({
  userRequest: UserRequestSchema,
  workspaceSnapshot: WorkspaceSnapshotSchema,
});

export type PlanRequest = z.infer<typeof PlanRequestSchema>;

/**
 * Structured planner/backend error payload.
 *
 * D2 makes this explicit instead of embedding an anonymous inline object inside
 * PlanResponse. That gives both TS and Python one shared error shape.
 */
export const PlanErrorSchema = z.object({
  code: z.enum([
    "invalid_request_payload",
    "invalid_plan_payload",
    "unsupported_request",
    "not_implemented",
    "internal_error",
  ]),
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type PlanError = z.infer<typeof PlanErrorSchema>;

/**
 * The backend can return exactly one of:
 * - executable plan
 * - explanation response
 * - structured error
 */
export const PlanResponseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("plan"),
    data: ExecutionPlanSchema,
  }),
  z.object({
    kind: z.literal("explanation"),
    data: ExplanationResponseSchema,
  }),
  z.object({
    kind: z.literal("error"),
    error: PlanErrorSchema,
  }),
]);

export type PlanResponse = z.infer<typeof PlanResponseSchema>;

/**
 * Approval decision request for future approval endpoints.
 *
 * D2 adds this early so the backend and extension do not drift once real
 * approval flow wiring begins.
 */
export const ApprovalDecisionRequestSchema = z.object({
  runId: z.string().min(1),
  planId: z.string().min(1),
  decision: ApprovalDecisionSchema,
  reason: z.string().min(1).optional(),
});

export type ApprovalDecisionRequest = z.infer<
  typeof ApprovalDecisionRequestSchema
>;

/**
 * Approval decision response carrying the durable recorded decision.
 */
export const ApprovalDecisionResponseSchema = z.object({
  approved: z.boolean(),
  record: ApprovalDecisionRecordSchema,
});

export type ApprovalDecisionResponse = z.infer<
  typeof ApprovalDecisionResponseSchema
>;

/**
 * Lightweight endpoint contract that only accepts and validates a collected
 * workspace snapshot from the extension.
 */
export const WorkspaceSnapshotAcceptanceRequestSchema = z.object({
  snapshot: WorkspaceSnapshotSchema,
  collectedAt: z.string().datetime(),
  source: z.literal("vscode-extension").default("vscode-extension"),
});

export type WorkspaceSnapshotAcceptanceRequest = z.infer<
  typeof WorkspaceSnapshotAcceptanceRequestSchema
>;

export const WorkspaceSnapshotAcceptanceSummarySchema = z.object({
  workspaceFolderCount: z.number().int().nonnegative(),
  detectedMarkerCount: z.number().int().nonnegative(),
  relevantFileCount: z.number().int().nonnegative(),
  installedTargetExtensionCount: z.number().int().nonnegative(),
  parsedVscodeFileCount: z.number().int().nonnegative(),
  invalidVscodeFileCount: z.number().int().nonnegative(),
  noteCount: z.number().int().nonnegative(),
});

export type WorkspaceSnapshotAcceptanceSummary = z.infer<
  typeof WorkspaceSnapshotAcceptanceSummarySchema
>;

export const WorkspaceSnapshotAcceptanceResponseSchema = z.object({
  accepted: z.boolean(),
  message: z.string().min(1),
  summary: WorkspaceSnapshotAcceptanceSummarySchema,
  warnings: z.array(z.string()).default([]),
});

export type WorkspaceSnapshotAcceptanceResponse = z.infer<
  typeof WorkspaceSnapshotAcceptanceResponseSchema
>;
