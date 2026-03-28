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

export const WorkspaceSnapshotSchema=z.object({
    workspaceFolders: z.array(WorkspaceFolderSchema).default([]),   
    hasWorkspaceFile: z.boolean().default(false),
    vscodeFolderPresent: z.boolean().default(false),
    detectedMarkers: z.array(z.string()).default([]),
    installedExtensions: z.array(z.string()).default([]),
    relevantFiles: z.array(z.string()).default([])

});

export type WorkspaceSnapshot = z.infer<typeof WorkspaceSnapshotSchema>;