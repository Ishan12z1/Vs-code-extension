import type {
  VscodeFileInspection,
  WorkspaceSnapshot,
} from "@control-agent/contracts";

/**
 * Creates the default state for one .vscode/* file.
 */
function createEmptyVscodeFileInspection(
  relativePath: string
): VscodeFileInspection {
  return {
    relativePath,
    exists: false,
    parseStatus: "not_found",
    parsedContent: null,
    parseError: null,
  };
}

/**
 * Creates the normalized empty snapshot.
 * Every inspector builds on top of this shape.
 */

export function createEmptyWorkspaceSnapshot(): WorkspaceSnapshot {
  return {
    workspaceFolders: [],
    hasWorkspaceFile: false,
    vscodeFolderPresent: false,
    detectedMarkers: [],
    installedExtensions: [],
    relevantFiles: [],
    relevantUserSettings: {},
    relevantWorkspaceSettings: {},
    installedTargetExtensions: [],
    keybindingSignals: [],
    vscodeFiles: {
      settingsJson: createEmptyVscodeFileInspection(".vscode/settings.json"),
      tasksJson: createEmptyVscodeFileInspection(".vscode/tasks.json"),
      launchJson: createEmptyVscodeFileInspection(".vscode/launch.json"),
      extensionsJson: createEmptyVscodeFileInspection(
        ".vscode/extensions.json"
      ),
    },
    notes: [],
  };
}
