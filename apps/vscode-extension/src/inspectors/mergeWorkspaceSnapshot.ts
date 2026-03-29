/*Combining inspector results are  into one final snapshot.*/

import type { WorkspaceSnapshot,WorkspaceFolder } from "@control-agent/contracts";

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
 * Merges one inspector result into the accumulated snapshot.
 * Booleans are OR'd, arrays are appended then deduplicated.
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
    ])
  };
}