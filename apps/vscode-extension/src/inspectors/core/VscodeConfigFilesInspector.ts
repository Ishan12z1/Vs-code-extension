import * as vscode from "vscode";
import type {
  //VscodeFileInspection,
  WorkspaceSnapshot,
} from "@control-agent/contracts";
import { readWorkspaceTextFile } from "../fs/readWorkspaceFile";
import { parseJsonc } from "../fs/parseJsonc";
import type { InspectionContext, WorkspaceInspector } from "../types";
import {
  aggregateManagedVscodeFileInspections,
  type FolderManagedVscodeFileInspection,
} from "./aggregateManagedVscodeFileInspections";

/**
 * Inspect the four V1-managed .vscode/* files in a read-only way.
 *
 *
 * - inspect all workspace folders instead of only the first one
 * - aggregate one normalized representative entry per managed file type
 * - emit explicit multi-root notes when several folders contain the same file
 *
 * Important constraint:
 * - the current shared snapshot contract still has one normalized entry per
 *   managed file kind, not one entry per workspace folder
 * - because of that, this inspector chooses one representative inspection and
 *   explains any multi-root ambiguity through notes
 */
export class VscodeConfigFilesInspector implements WorkspaceInspector {
  public readonly id = "vscodeConfigFiles";

  public async inspect(
    context: InspectionContext
  ): Promise<Partial<WorkspaceSnapshot>> {
    if (context.workspaceFolders.length === 0) {
      return {
        notes: [
          "No workspace folder is open, so .vscode/* file inspection was skipped.",
        ],
      };
    }

    const notes: string[] = [];

    /**
     * Inspect all workspace folders for each of the four managed file kinds.
     *
     * Keep the relative paths explicit and stable so later summary logic and
     * tests do not depend on hidden ordering.
     */
    const managedRelativePaths = [
      ".vscode/settings.json",
      ".vscode/tasks.json",
      ".vscode/launch.json",
      ".vscode/extensions.json",
    ] as const;

    const perPathEntries = new Map<string, FolderManagedVscodeFileInspection[]>(
      managedRelativePaths.map((relativePath) => [relativePath, []])
    );

    for (const workspaceFolder of context.workspaceFolders) {
      for (const relativePath of managedRelativePaths) {
        const entry = await this.inspectOneFile(workspaceFolder, relativePath);
        perPathEntries.get(relativePath)!.push(entry);
      }
    }

    const aggregatedSettings = aggregateManagedVscodeFileInspections(
      ".vscode/settings.json",
      perPathEntries.get(".vscode/settings.json") ?? []
    );
    const aggregatedTasks = aggregateManagedVscodeFileInspections(
      ".vscode/tasks.json",
      perPathEntries.get(".vscode/tasks.json") ?? []
    );
    const aggregatedLaunch = aggregateManagedVscodeFileInspections(
      ".vscode/launch.json",
      perPathEntries.get(".vscode/launch.json") ?? []
    );
    const aggregatedExtensions = aggregateManagedVscodeFileInspections(
      ".vscode/extensions.json",
      perPathEntries.get(".vscode/extensions.json") ?? []
    );

    const allAggregated = [
      aggregatedSettings,
      aggregatedTasks,
      aggregatedLaunch,
      aggregatedExtensions,
    ];

    /**
     * Mark the .vscode folder as effectively present if at least one managed file
     * exists in any workspace folder.
     */
    const vscodeFolderPresent = allAggregated.some(
      (result) => result.inspection.exists
    );

    /**
     * Relevant files should include the concrete workspace-relative file paths
     * that actually exist across the whole workspace context.
     */
    const relevantFiles = allAggregated.flatMap(
      (result) => result.relevantFiles
    );

    /**
     * Surface any invalid JSONC states and multi-root ambiguity notes.
     */
    notes.push(...allAggregated.flatMap((result) => result.notes));

    for (const result of allAggregated) {
      const file = result.inspection;

      if (file.parseStatus === "invalid_jsonc" && file.parseError) {
        notes.push(
          `${file.relativePath} could not be parsed: ${file.parseError}`
        );
      }
    }

    return {
      vscodeFolderPresent,
      relevantFiles,
      vscodeFiles: {
        settingsJson: aggregatedSettings.inspection,
        tasksJson: aggregatedTasks.inspection,
        launchJson: aggregatedLaunch.inspection,
        extensionsJson: aggregatedExtensions.inspection,
      },
      notes,
    };
  }

  /**
   * Reads and parses one managed .vscode/* file under one workspace folder.
   *
   * Missing files are not errors.
   */
  private async inspectOneFile(
    workspaceFolder: vscode.WorkspaceFolder,
    relativePath: string
  ): Promise<FolderManagedVscodeFileInspection> {
    const fileRead = await readWorkspaceTextFile(workspaceFolder, relativePath);

    if (!fileRead.exists || fileRead.text === null) {
      return {
        folderName: workspaceFolder.name,
        workspaceRelativePath: vscode.workspace.asRelativePath(
          fileRead.uri,
          false
        ),
        inspection: {
          relativePath,
          exists: false,
          parseStatus: "not_found",
          parsedContent: null,
          parseError: null,
        },
      };
    }

    const parsed = parseJsonc(fileRead.text);

    if (!parsed.ok) {
      return {
        folderName: workspaceFolder.name,
        workspaceRelativePath: vscode.workspace.asRelativePath(
          fileRead.uri,
          false
        ),
        inspection: {
          relativePath,
          exists: true,
          parseStatus: "invalid_jsonc",
          parsedContent: null,
          parseError: parsed.error,
        },
      };
    }

    return {
      folderName: workspaceFolder.name,
      workspaceRelativePath: vscode.workspace.asRelativePath(
        fileRead.uri,
        false
      ),
      inspection: {
        relativePath,
        exists: true,
        parseStatus: "parsed",
        parsedContent: parsed.value,
        parseError: null,
      },
    };
  }
}
