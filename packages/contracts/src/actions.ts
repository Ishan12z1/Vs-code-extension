import {z} from "zod";
import { RiskLevelSchema} from "./risk";

/**These are the only allowed action types. */

export const ActionTypeSchema = z.enum([
  "updateUserSettings",
  "updateWorkspaceSettings",
  "patchVscodeSettingsJson",
  "patchTasksJson",
  "patchLaunchJson",
  "patchExtensionsJson",
  "updateKeybindings"
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

/**
tells where the action applies.

user → user-level settings
workspace → workspace settings/config
workspaceFile → a specific workspace file like .vscode/tasks.json
 */
export const ActionScopeSchema=z.enum([
    "user",
    "workspace",
    "workspaceFile"

]);

export type ActionScope = z.infer<typeof ActionScopeSchema>;

/**
Schema for action has a preview information : 
    summary: human-readable explanation
    targetLabel: which thing is being changed
    before: previous value or state
    after: new value or state
    diffText: optional textual diff
 */

export const ActionPreviewSchema = z.object({
    summary:z.string().min(1),
    targetLabel:z.string().min(1),
    before:z.unknown().optional(),
    after:z.unknown().optional(),
    diffText:z.string().min(1).optional()

});

export type ActionPreview = z.infer<typeof ActionPreviewSchema>;


/**
 Core Action Schema 

    id → stable reference
    actionType → what action this is
    scope → where it applies
    target → exact thing being changed
    parameters → structured inputs needed to execute
    riskLevel → risk classification
    requiresApproval → per-action guard
    preview → user-visible change preview
    executionMethod → how extension should perform it
    rollbackMethod → how it can be reversed
 */

export const PlannedActionSchema=z.object({

    id: z.string().min(1),
    actionType: ActionTypeSchema,
    scope: ActionScopeSchema,
    target: z.string().min(1),
    parameters: z.record(z.string(), z.unknown()).default({}),
    riskLevel: RiskLevelSchema,
    requiresApproval: z.boolean(),
    preview: ActionPreviewSchema,
    executionMethod: z.string().min(1),
    rollbackMethod: z.string().min(1)
});

export type PlannedAction = z.infer<typeof PlannedActionSchema>;