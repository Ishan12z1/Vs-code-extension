/*Combining inspector results are  into one final snapshot.*/

import type {
  InstalledTargetExtension,
  KeybindingSignal,
  WorkspaceFolder,
  WorkspaceSnapshot
} from "@control-agent/contracts";

/*removes duplicates from a string array while preserving input order */
function uniqueStrings(values:string[]):string[]{
    return Array.from(new Set(values.map((value)=>value.trim()).filter(Boolean)));
}

/**
 * Deduplicates workspace folders using name + uri as a stable key.
 */
function uniqueWorkspaceFolders(values:WorkspaceFolder[]):WorkspaceFolder[]{
    const seen = new Set<string>();
    const result : WorkspaceFolder[] = [];
    for (const folder of values) {
        const key = '${folder.name}::${folder.uri}';
        if (seen.has(key)) {
            continue; 
        }
        seen.add(key);
        result.push(folder);
    }
    return result;

}


/**
 * Deduplicates selected extension state by id.
 * Later entries win so newer inspector output can override older data.
 */
function uniqueInstalledTargetExtensions(
  values:InstalledTargetExtension[]
):InstalledTargetExtension[]{
  const byId=new Map<string,InstalledTargetExtension>();
  for (const extension of values){
    byId.set(extension.id,extension);
  }
  return Array.from(byId.values());

}

/**
 * Deduplicates keybinding/command signals by command.
 * Later entries win.
 */
function uniqueKeybindingSignals(values: KeybindingSignal[]): KeybindingSignal[] {
  const byCommand = new Map<string, KeybindingSignal>();

  for (const value of values) {
    byCommand.set(value.command, value);
  }

  return Array.from(byCommand.values());
}


/**
 * Merges one inspector result into the current snapshot.
 *
 * Rules:
 * - booleans: OR merge
 * - arrays: append then dedupe
 * - records: shallow merge
 */
export function mergeWorkspaceSnapshot(
  current: WorkspaceSnapshot,
  patch: Partial<WorkspaceSnapshot>
): WorkspaceSnapshot {
  return {
    workspaceFolders: uniqueWorkspaceFolders([
      ...current.workspaceFolders,
      ...(patch.workspaceFolders ?? [])
    ]),
    hasWorkspaceFile: current.hasWorkspaceFile || (patch.hasWorkspaceFile ?? false),
    vscodeFolderPresent:
      current.vscodeFolderPresent || (patch.vscodeFolderPresent ?? false),
    detectedMarkers: uniqueStrings([
      ...current.detectedMarkers,
      ...(patch.detectedMarkers ?? [])
    ]),
    installedExtensions: uniqueStrings([
      ...current.installedExtensions,
      ...(patch.installedExtensions ?? [])
    ]),
    relevantFiles: uniqueStrings([
      ...current.relevantFiles,
      ...(patch.relevantFiles ?? [])
    ]),

    relevantUserSettings: {
      ...current.relevantUserSettings,
      ...(patch.relevantUserSettings ?? {})
    },
    relevantWorkspaceSettings: {
      ...current.relevantWorkspaceSettings,
      ...(patch.relevantWorkspaceSettings ?? {})
    },
    installedTargetExtensions: uniqueInstalledTargetExtensions([
      ...current.installedTargetExtensions,
      ...(patch.installedTargetExtensions ?? [])
    ]),
    keybindingSignals: uniqueKeybindingSignals([
      ...current.keybindingSignals,
      ...(patch.keybindingSignals ?? [])
    ]),
    notes: uniqueStrings([...current.notes, ...(patch.notes ?? [])])
  };
}