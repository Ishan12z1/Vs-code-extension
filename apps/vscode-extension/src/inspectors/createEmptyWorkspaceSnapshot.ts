import type { WorkspaceSnapshot } from "@control-agent/contracts";

/**
 * Creates the normalized empty snapshot.
 * Every inspector builds on top of this shape.
 */

export function createEmptyWorkspaceSnapshot():WorkspaceSnapshot{

    return {
        workspaceFolders:[],
        hasWorkspaceFile: false,
        vscodeFolderPresent: false,
        detectedMarkers:[],
        installedExtensions:[],
        relevantFiles:[],
        relevantUserSettings: {},
        relevantWorkspaceSettings: {},
        installedTargetExtensions: [],
        keybindingSignals: [],
        notes: []
    };


};