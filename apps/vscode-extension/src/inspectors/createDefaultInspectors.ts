import type { WorkspaceInspector } from "./types";
import { CommandAvailabilityInspector } from "./core/CommandAvailabilityInspector";
import { InstalledExtensionsInspector } from "./core/InstalledExtensionsInspector";
import { SettingsInspector } from "./core/SettingsInspector";
import { StackMarkerInspector } from "./core/StackMarkerInspector";
import { VscodeConfigFilesInspector } from "./core/VscodeConfigFilesInspector";
import { WorkspaceFoldersInspector } from "./core/WorkspaceFoldersInspector";

/**
 * The order is intentional:
 * 1. bootstrap workspace shape
 * 2. read relevant VS Code settings
 * 3. inspect managed .vscode/* files
 * 4. inspect root marker files and infer likely stacks
 * 5. inspect selected extension state
 * 6. inspect command availability
 */
export function createDefaultInspectors(): WorkspaceInspector[] {
  return [
    new WorkspaceFoldersInspector(),
    new SettingsInspector(),
    new VscodeConfigFilesInspector(),
    new StackMarkerInspector(),
    new InstalledExtensionsInspector(),
    new CommandAvailabilityInspector(),
  ];
}
