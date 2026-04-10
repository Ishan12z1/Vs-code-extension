import { z } from "zod";

/**
 * The request class defines the allowed incoming user-intent categories.
 */
export const RequestClassSchema = z.enum([
  "explain",
  "inspect",
  "configure",
  "repair",
  "guide",
]);

/**
 * TypeScript type inferred from the request-class schema.
 */
export type RequestClass = z.infer<typeof RequestClassSchema>;

/**
 * Basic user request payload passed to the backend.
 *
 * D1 change:
 * - use createdAt instead of created_at
 *
 * Why:
 * - the rest of the shared contracts are already mostly camelCase
 * - the Python mirror currently uses createdAt
 * - this removes one obvious cross-language mismatch
 */
export const UserRequestSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  requestClassHint: RequestClassSchema.optional(),
  createdAt: z.string().datetime().optional(),
});

export type UserRequest = z.infer<typeof UserRequestSchema>;

/**
 * One workspace folder entry.
 */
export const WorkspaceFolderSchema = z.object({
  name: z.string().min(1),
  uri: z.string().min(1),
});

export type WorkspaceFolder = z.infer<typeof WorkspaceFolderSchema>;

/**
 * Selected extension state.
 *
 * Keep this deliberately narrow:
 * - installed
 * - version
 * - activation state
 */
export const InstalledTargetExtensionSchema = z.object({
  id: z.string().min(1),
  installed: z.boolean(),
  version: z.string().nullable().default(null),
  isActive: z.boolean().default(false),
});

export type InstalledTargetExtension = z.infer<
  typeof InstalledTargetExtensionSchema
>;

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
  note: z.string().nullable().default(null),
});

export type KeybindingSignal = z.infer<typeof KeybindingSignalSchema>;

/**
 * Parse status for a .vscode/* file inspection.
 *
 * - not_found: the file does not exist
 * - parsed: file exists and parsed as JSONC successfully
 * - invalid_jsonc: file exists but parsing failed
 */
export const VscodeFileParsedStatusSchema = z.enum([
  "not_found",
  "parsed",
  "invalid_jsonc",
]);

export type VscodeFileParsedStatus = z.infer<
  typeof VscodeFileParsedStatusSchema
>;

/**
 * Normalized inspection result for one .vscode/* file.
 *
 * D1 note:
 * - keep the payload field name as "json"
 * - the Python mirror must use the same field name
 *
 * We keep the payload generic because each file has different shapes:
 * - settings.json => object
 * - tasks.json => object
 * - launch.json => object
 * - extensions.json => object
 */
export const VscodeFileInspectionSchema = z.object({
  relativePath: z.string().min(1),
  exists: z.boolean(),
  parseStatus: VscodeFileParsedStatusSchema,
  json: z.unknown().nullable().default(null),
  parseError: z.string().nullable().default(null),
});

export type VscodeFileInspection = z.infer<typeof VscodeFileInspectionSchema>;

/**
 * Group the managed .vscode/* file states into one stable object.
 */
export const VscodeFilesSnapshotSchema = z.object({
  settingsJson: VscodeFileInspectionSchema,
  tasksJson: VscodeFileInspectionSchema,
  launchJson: VscodeFileInspectionSchema,
  extensionsJson: VscodeFileInspectionSchema,
});

export type VscodeFilesSnapshot = z.infer<typeof VscodeFilesSnapshotSchema>;

/**
 * Normalized workspace snapshot.
 *
 * This includes:
 * - relevant user settings
 * - relevant workspace settings
 * - selected extension state
 * - keybinding/command signals
 * - parsed .vscode/* file inspection state
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
  installedTargetExtensions: z
    .array(InstalledTargetExtensionSchema)
    .default([]),
  keybindingSignals: z.array(KeybindingSignalSchema).default([]),

  vscodeFiles: VscodeFilesSnapshotSchema,
  notes: z.array(z.string()).default([]),
});

export type WorkspaceSnapshot = z.infer<typeof WorkspaceSnapshotSchema>;
