import { z } from "zod";
import { RiskLevelSchema } from "./policy";
import { SurfaceNameSchema } from "./surfaces";

export const ToolNameSchema = z.enum([
  "inspect_user_settings",
  "inspect_workspace_settings",
  "inspect_keybindings",
  "inspect_tasks_json",
  "inspect_launch_json",
  "list_installed_extensions",
  "get_extension_details",
  "search_marketplace_extensions",
  "fetch_marketplace_extension_metadata",
  "set_user_setting",
  "set_workspace_setting",
  "patch_keybindings",
  "install_extension",
  "update_extension",
  "enable_extension",
  "disable_extension",
  "uninstall_extension",
  "patch_tasks_json",
  "patch_launch_json",
  "create_snapshot",
  "generate_preview",
  "request_approval",
  "verify_expected_state",
  "rollback_snapshot",
  "summarize_run",
]);

export type ToolName = z.infer<typeof ToolNameSchema>;

export const ToolCategorySchema = z.enum([
  "inspection",
  "action",
  "control",
  "marketplace",
]);

export type ToolCategory = z.infer<typeof ToolCategorySchema>;

export const ToolCallRequestSchema = z.object({
  callId: z.string().min(1),
  runId: z.string().min(1),
  toolName: ToolNameSchema,
  arguments: z.record(z.string(), z.unknown()).default({}),
  targetSurface: SurfaceNameSchema.optional(),
  reasoning: z.string().min(1).optional(),
  requestedAt: z.string().datetime(),
});

export type ToolCallRequest = z.infer<typeof ToolCallRequestSchema>;

export const ToolCallStatusSchema = z.enum([
  "pending",
  "succeeded",
  "failed",
  "blocked",
  "skipped",
  "waitingApproval",
]);

export type ToolCallStatus = z.infer<typeof ToolCallStatusSchema>;

export const ToolCallResultSchema = z.object({
  callId: z.string().min(1),
  runId: z.string().min(1),
  toolName: ToolNameSchema,
  status: ToolCallStatusSchema,
  success: z.boolean().optional(),
  summary: z.string().min(1),
  output: z.unknown().optional(),
  warnings: z.array(z.string()).default([]),
  changedTargets: z.array(z.string()).default([]),
  requiresVerification: z.boolean().default(false),
  completedAt: z.string().datetime(),
});

export type ToolCallResult = z.infer<typeof ToolCallResultSchema>;

export const ToolDefinitionSchema = z.object({
  name: ToolNameSchema,
  category: ToolCategorySchema,
  description: z.string().min(1),
  readableSurfaces: z.array(SurfaceNameSchema).default([]),
  writableSurfaces: z.array(SurfaceNameSchema).default([]),
  riskLevel: RiskLevelSchema,
  requiresApproval: z.boolean().default(false),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;
