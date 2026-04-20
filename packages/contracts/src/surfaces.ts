import { z } from "zod";

export const SurfaceNameSchema = z.enum([
  "userSettings",
  "workspaceSettings",
  "keybindings",
  "extensionsLifecycle",
  "tasksJson",
  "launchJson",
]);

export type SurfaceName = z.infer<typeof SurfaceNameSchema>;

export const SurfaceActionSchema = z.object({
  actionId: z.string().min(1),
  surface: SurfaceNameSchema,
  operation: z.string().min(1),
  target: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({}),
});

export type SurfaceAction = z.infer<typeof SurfaceActionSchema>;

export const SurfaceStateSchema = z.object({
  surface: SurfaceNameSchema,
  target: z.string().min(1),
  exists: z.boolean().default(true),
  data: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  collectedAt: z.string().datetime(),
});

export type SurfaceState = z.infer<typeof SurfaceStateSchema>;

export const ActionPreviewSchema = z.object({
  summary: z.string().min(1),
  targetLabel: z.string().min(1),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  diffText: z.string().min(1).optional(),
  warnings: z.array(z.string()).default([]),
});

export type ActionPreview = z.infer<typeof ActionPreviewSchema>;

export const VerificationStatusSchema = z.enum([
  "verified",
  "mismatch",
  "not_applicable",
  "failed",
]);

export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const VerificationResultSchema = z.object({
  surface: SurfaceNameSchema,
  status: VerificationStatusSchema,
  success: z.boolean(),
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).default({}),
  warnings: z.array(z.string()).default([]),
  verifiedAt: z.string().datetime(),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;
