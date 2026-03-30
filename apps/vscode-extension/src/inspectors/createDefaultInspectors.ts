import type { WorkspaceInspector } from "./types";
import { CommandAvailabilityInspector } from "./core/CommandAvailabilityInspector";
import { InstalledExtensionsInspector } from "./core/InstalledExtensionsInspector";
import { SettingsInspector } from "./core/SettingsInspector";
import { WorkspaceFoldersInspector } from "./core/WorkspaceFoldersInspector";

/**
 * The order is intentional:
 * 1. bootstrap workspace shape
 * 2. relevant settings
 * 3. selected extension state
 * 4. keybinding-related command signals
 */
export function createDefaultInspectors(): WorkspaceInspector[] {
  return [
    new WorkspaceFoldersInspector(),
    new SettingsInspector(),
    new InstalledExtensionsInspector(),
    new CommandAvailabilityInspector()
  ];
}