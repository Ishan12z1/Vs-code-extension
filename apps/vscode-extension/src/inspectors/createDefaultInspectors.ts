import type { WorkspaceInspector } from "./types";
import { CommandAvailabilityInspector } from "./core/CommandAvailabilityInspector";
import { InstalledExtensionsInspector } from "./core/InstalledExtensionsInspector";
import { SettingsInspector } from "./core/SettingsInspector";
import { VscodeConfigFilesInspector } from "./core/VscodeConfigFilesInspector";
import { WorkspaceFoldersInspector } from "./core/WorkspaceFoldersInspector";

/**
 * The order is intentional:
 * 1. bootstrap workspace shape
 * 2. read settings from VS Code config
 * 3. inspect managed .vscode/* files
 * 4. inspect selected extension state
 * 5. inspect key command availability
 */
export function createDefaultInspectors(): WorkspaceInspector[] {
  return [
    new WorkspaceFoldersInspector(),
    new SettingsInspector(),
    new VscodeConfigFilesInspector(),
    new InstalledExtensionsInspector(),
    new CommandAvailabilityInspector()
  ];
}