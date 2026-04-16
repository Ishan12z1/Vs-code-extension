import type { VscodeFileInspection } from "@control-agent/contracts";

/**
 * One managed .vscode/* file inspection result tied to a specific workspace folder.
 *
 * We keep this internal to the multi-root aggregation logic.
 */
export interface FolderManagedVscodeFileInspection {
  readonly folderName: string;
  readonly workspaceRelativePath: string;
  readonly inspection: VscodeFileInspection;
}

/**
 * Aggregated result for one managed .vscode/* file kind across all workspace folders.
 *
 * Why this exists:
 * - the current shared snapshot shape only has one normalized entry per managed file
 * - multi-root workspaces may contain several copies of the same managed file
 * - we need one representative entry plus notes and relevant file paths
 */
export interface AggregatedManagedVscodeFileResult {
  readonly inspection: VscodeFileInspection;
  readonly relevantFiles: string[];
  readonly notes: string[];
}

/**
 * Creates the default aggregated "not found" state for one managed file.
 */
function createDefaultInspection(relativePath: string): VscodeFileInspection {
  return {
    relativePath,
    exists: false,
    parseStatus: "not_found",
    parsedContent: null,
    parseError: null,
  };
}

/**
 * Chooses one representative normalized inspection across all workspace folders.
 *
 * Precedence:
 * 1. parsed
 * 2. invalid_jsonc
 * 3. not_found
 *
 * Why this order:
 * - if any folder has a valid parsed copy, that is the most useful representative
 * - if none parsed but one or more are invalid, surface that invalid state
 * - otherwise the file is effectively not found in the current workspace context
 */
export function aggregateManagedVscodeFileInspections(
  relativePath: string,
  entries: readonly FolderManagedVscodeFileInspection[]
): AggregatedManagedVscodeFileResult {
  const existingEntries = entries.filter((entry) => entry.inspection.exists);
  const parsedEntries = existingEntries.filter(
    (entry) => entry.inspection.parseStatus === "parsed"
  );
  const invalidEntries = existingEntries.filter(
    (entry) => entry.inspection.parseStatus === "invalid_jsonc"
  );

  const relevantFiles = existingEntries.map(
    (entry) => entry.workspaceRelativePath
  );
  const notes: string[] = [];

  if (existingEntries.length > 1) {
    notes.push(
      `Multi-root workspace: found ${relativePath} in ${existingEntries.length} workspace folders (${existingEntries
        .map((entry) => `"${entry.folderName}"`)
        .join(", ")}).`
    );
  }

  if (parsedEntries.length > 0) {
    const representative = parsedEntries[0]!.inspection;

    if (parsedEntries.length > 1) {
      notes.push(
        `Multi-root workspace: multiple parsed copies of ${relativePath} were found; using ${parsedEntries[0]!.workspaceRelativePath} as the representative normalized snapshot entry.`
      );
    }

    if (invalidEntries.length > 0) {
      notes.push(
        `Multi-root workspace: some ${relativePath} files are invalid JSONC even though at least one parsed successfully.`
      );
    }

    return {
      inspection: representative,
      relevantFiles,
      notes,
    };
  }

  if (invalidEntries.length > 0) {
    const representative = invalidEntries[0]!.inspection;

    if (invalidEntries.length > 1) {
      notes.push(
        `Multi-root workspace: multiple invalid copies of ${relativePath} were found; using ${invalidEntries[0]!.workspaceRelativePath} as the representative normalized snapshot entry.`
      );
    }

    return {
      inspection: representative,
      relevantFiles,
      notes,
    };
  }

  return {
    inspection: createDefaultInspection(relativePath),
    relevantFiles,
    notes,
  };
}
