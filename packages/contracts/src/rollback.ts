import { z } from "zod";
import { SurfaceNameSchema } from "./surfaces";

export const RollbackSnapshotSchema = z.object({
  snapshotId: z.string().min(1),
  runId: z.string().min(1),
  stepIndex: z.number().int().nonnegative(),
  surface: SurfaceNameSchema,
  target: z.string().min(1),
  actionOperation: z.string().min(1),
  snapshotKind: z.string().min(1),
  snapshotData: z.unknown(),
  createdAt: z.string().datetime(),
});

export type RollbackSnapshot = z.infer<typeof RollbackSnapshotSchema>;

export const RollbackScopeSchema = z.enum([
  "latestStep",
  "latestRun",
  "specificSnapshot",
]);

export type RollbackScope = z.infer<typeof RollbackScopeSchema>;

export const RollbackRequestSchema = z.object({
  runId: z.string().min(1),
  scope: RollbackScopeSchema,
  snapshotId: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  requestedAt: z.string().datetime(),
});

export type RollbackRequest = z.infer<typeof RollbackRequestSchema>;
