import * as vscode from "vscode";
import type {
  VscodeFileInspection,
  WorkspaceSnapshot,
} from "@control-agent/contracts";
import { readWorkspaceTextFile } from "../fs/readWorkspaceFile";
import { parseJsonc } from "../fs/parseJsonc";
import type { InspectionContext, WorkspaceInspector } from "../types";

/**
 * Inspect the four V1-managed .vscode/* files in a read-only way.
 *
 * Important limitation for this slice:
 * - if the user has multiple workspace folders open, we inspect only
 *   the first folder for .vscode/* files
 *
 */
export class VscodeConfigFilesInspector implements WorkspaceInspector {
  public readonly id = "vscodeConfigFiles";

  public async inspect(
    context: InspectionContext
  ): Promise<Partial<WorkspaceSnapshot>> {
    const primaryWorkspaceFolder = context.workspaceFolders[0];

    if (!primaryWorkspaceFolder) {
      return {
        notes: [
          "No workspace folder is open, so .vscode/* file inspection was skipped.",
        ],
      };
    }

    const notes: string[] = [];

    if (context.workspaceFolders.length > 1) {
      notes.push(
        "Multi-root workspace detected; only the first workspace folder was inspected for .vscode/* files in this slice."
      );
    }

    const settingsJson = await this.inspectOneFile(
      primaryWorkspaceFolder,
      ".vscode/settings.json"
    );
    const tasksJson = await this.inspectOneFile(
      primaryWorkspaceFolder,
      ".vscode/tasks.json"
    );
    const launchJson = await this.inspectOneFile(
      primaryWorkspaceFolder,
      ".vscode/launch.json"
    );
    const extensionsJson = await this.inspectOneFile(
      primaryWorkspaceFolder,
      ".vscode/extensions.json"
    );

    /**
     * Mark the .vscode folder as present if at least one managed file exists.
     * That is good enough for this read-only slice.
     */
    const vscodeFolderPresent = [
      settingsJson,
      tasksJson,
      launchJson,
      extensionsJson,
    ].some((file) => file.exists);

    /**
     * Relevant files are the ones that actually exist right now.
     */
    const relevantFiles = [settingsJson, tasksJson, launchJson, extensionsJson]
      .filter((file) => file.exists)
      .map((file) => file.relativePath);

    /**
     * Record invalid files as notes so the summary layer can surface them later.
     */
    for (const file of [settingsJson, tasksJson, launchJson, extensionsJson]) {
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
        settingsJson,
        tasksJson,
        launchJson,
        extensionsJson,
      },
      notes,
    };
  }

  /**
   * Reads and parses one managed .vscode/* file.
   * Missing files are not errors.
   */
  private async inspectOneFile(
    workspaceFolder: vscode.WorkspaceFolder,
    relativePath: string
  ): Promise<VscodeFileInspection> {
    const fileRead = await readWorkspaceTextFile(workspaceFolder, relativePath);

    if (!fileRead.exists || fileRead.text === null) {
      return {
        relativePath,
        exists: false,
        parseStatus: "not_found",
        json: null,
        parseError: null,
      };
    }

    const parsed = parseJsonc(fileRead.text);

    if (!parsed.ok) {
      return {
        relativePath,
        exists: true,
        parseStatus: "invalid_jsonc",
        json: null,
        parseError: parsed.error,
      };
    }

    return {
      relativePath,
      exists: true,
      parseStatus: "parsed",
      json: parsed.value,
      parseError: null,
    };
  }
}
