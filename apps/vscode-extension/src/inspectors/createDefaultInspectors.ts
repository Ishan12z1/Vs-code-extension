/* Defines which inspectors are enabled by default */
import type { WorkspaceInspector } from "./types";
import { WorkspaceFoldersInspector } from "./core/WorkspaceFoldersInspector";

/* Central place to decide which inspectors are active. */

export function createDefaultInspectors():WorkspaceInspector[]{
        // Foundation inspector.
    return [new WorkspaceFoldersInspector()];
};