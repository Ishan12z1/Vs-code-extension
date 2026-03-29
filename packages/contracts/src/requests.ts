import { z } from "zod";

/**
 * The request class defines what are the possible type of incoming user intent
 */
export const RequestClassSchema =z.enum([
    "explain",
    "inspect",
    "configure",
    "repair",
    "guide"
]);
/**
 *  This generate a typescript type from the zod schema
 */
export type RequestClass = z.infer<typeof RequestClassSchema>;



export const UserRequestSchema=z.object({
    id:z.string().min(1),
    text:z.string().min(1),
    requestClassHint:RequestClassSchema.optional(),
    created_at:z.string().datetime().optional()

});

export type UserRequest = z.infer<typeof UserRequestSchema>;


/**
 * This is the workspace schema for context helping
 */
export const WorkspaceFolderSchema=z.object({
    name:z.string().min(1),
    uri:z.string().min(1)

});

export type WorkspaceFolder = z.infer<typeof WorkspaceFolderSchema>;

/**
 *  * Selected extension state.
 * Keep this deliberately narrow:
 * - installed
 * - version
 * - activation state
 *
 */

export const InstalledTargetExtensionSchema=z.object({
    id:z.string().min(1),
    installed:z.boolean(),
    version:z.string().nullable().default(null),
    isActive:z.boolean().default(false)

});

export type InstalledTargetExtension = z.infer<typeof InstalledTargetExtensionSchema>;

/**
 * Keybinding-related signal.
 *
 * In this slice we only capture command availability and leave the
 * actual keybinding string nullable. That is honest and enough for
 * early inspection.
 */
export const KeybindingSignalSchema = z.object({
  command: z.string().min(1),
  available: z.boolean(),
  keybinding: z.string().nullable().default(null),
  note: z.string().nullable().default(null)
});

export type KeybindingSignal = z.infer<typeof KeybindingSignalSchema>;


/**
 * Normalized workspace snapshot.
 *
 * This now includes:
 * - relevant user settings
 * - relevant workspace settings
 * - selected extension state
 * - keybinding/command signals
 */
export const WorkspaceSnapshotSchema = z.object({
  workspaceFolders: z.array(WorkspaceFolderSchema).default([]),
  hasWorkspaceFile: z.boolean().default(false),
  vscodeFolderPresent: z.boolean().default(false),
  detectedMarkers: z.array(z.string()).default([]),
  installedExtensions: z.array(z.string()).default([]),
  relevantFiles: z.array(z.string()).default([]),

  relevantUserSettings: z.record(z.string(), z.unknown()).default({}),
  relevantWorkspaceSettings: z.record(z.string(), z.unknown()).default({}),
  installedTargetExtensions: z.array(InstalledTargetExtensionSchema).default([]),
  keybindingSignals: z.array(KeybindingSignalSchema).default([]),
  notes: z.array(z.string()).default([])
});

export type WorkspaceSnapshot = z.infer<typeof WorkspaceSnapshotSchema>;