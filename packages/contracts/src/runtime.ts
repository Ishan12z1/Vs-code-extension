import { z } from "zod";
import { ApprovalDecisionRecordSchema } from "./policy";
import { RollbackSnapshotSchema } from "./rollback";
import { SurfaceNameSchema } from "./surfaces";
import { ToolCallRequestSchema, ToolCallResultSchema } from "./tools";

export const AgentGoalSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  createdAt: z.string().datetime(),
  requestClassHint: z
    .enum(["explain", "inspect", "configure", "repair", "guide"])
    .optional(),
});

export type AgentGoal = z.infer<typeof AgentGoalSchema>;

export const RunStatusSchema = z.enum([
  "idle",
  "running",
  "waitingApproval",
  "blocked",
  "completed",
  "failed",
  "cancelled",
]);

export type RunStatus = z.infer<typeof RunStatusSchema>;

export const RunCheckpointSchema = z.object({
  checkpointId: z.string().min(1),
  runId: z.string().min(1),
  stepIndex: z.number().int().nonnegative(),
  status: RunStatusSchema,
  activeSurface: SurfaceNameSchema.optional(),
  note: z.string().min(1),
  context: z.record(z.string(), z.unknown()).default({}),
  pendingToolCall: ToolCallRequestSchema.optional(),
  createdAt: z.string().datetime(),
});

export type RunCheckpoint = z.infer<typeof RunCheckpointSchema>;

export const RunSummarySchema = z.object({
  runId: z.string().min(1),
  goalText: z.string().min(1),
  status: RunStatusSchema,
  totalSteps: z.number().int().nonnegative(),
  approvalsUsed: z.number().int().nonnegative().default(0),
  rollbackAvailable: z.boolean().default(false),
  summary: z.string().min(1),
  warnings: z.array(z.string()).default([]),
  completedAt: z.string().datetime().optional(),
});

export type RunSummary = z.infer<typeof RunSummarySchema>;

export const AgentRunStateSchema = z.object({
  runId: z.string().min(1),
  goal: AgentGoalSchema,
  status: RunStatusSchema,
  currentStep: z.number().int().nonnegative(),
  maxSteps: z.number().int().positive(),
  activeSurface: SurfaceNameSchema.optional(),
  context: z.record(z.string(), z.unknown()).default({}),
  pendingToolCall: ToolCallRequestSchema.optional(),
  history: z.array(ToolCallResultSchema).default([]),
  approvals: z.array(ApprovalDecisionRecordSchema).default([]),
  checkpoints: z.array(RunCheckpointSchema).default([]),
  snapshots: z.array(RollbackSnapshotSchema).default([]),
  finalSummary: RunSummarySchema.optional(),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AgentRunState = z.infer<typeof AgentRunStateSchema>;
