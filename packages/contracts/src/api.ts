/*This file defines the request/response boundary between frontend/extension and backend planner. */

import {z} from "zod";
import { ExecutionPlanSchema, ExplanationResponseSchema } from "./plan";
import { UserRequestSchema, WorkspaceSnapshotSchema } from "./requests";

/*planner API takes two inputs:

what the user wants
what the workspace looks like
*/

export const PlanRequestSchema = z.object({
  userRequest: UserRequestSchema,
  workspaceSnapshot: WorkspaceSnapshotSchema
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
    data: ExecutionPlanSchema
  }),
  z.object({
    kind: z.literal("explanation"),
    data: ExplanationResponseSchema
  }),
  z.object({
    kind: z.literal("error"),
    error: z.object({
      code: z.string().min(1),
      message: z.string().min(1)
    })
  })
]);

export type PlanResponse = z.infer<typeof PlanResponseSchema>;

