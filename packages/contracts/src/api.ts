/*This file defines the request/response boundary between frontend/extension and backend planner. */

import { z } from "zod";
import { ExecutionPlanSchema, ExplanationResponseSchema } from "./plan";
import { UserRequestSchema, WorkspaceSnapshotSchema } from "./requests";

/*planner API takes two inputs:

what the user wants
what the workspace looks like
*/

export const PlanRequestSchema = z.object({
  userRequest: UserRequestSchema,
  workspaceSnapshot: WorkspaceSnapshotSchema,
});

export type PlanRequest = z.infer<typeof PlanRequestSchema>;

/*The backend can return exactly one of three response shapes:

kind: "plan" → executable plan
kind: "explanation" → diagnostic/explanatory response
kind: "error" → structured failure
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
    error: z.object({
      code: z.string().min(1),
      message: z.string().min(1),
    }),
  }),
]);

export type PlanResponse = z.infer<typeof PlanResponseSchema>;

/**
 * Lightweight endpoint contract that only accepts and validates
 * a collected workspaceSnapshot from the extension.
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
