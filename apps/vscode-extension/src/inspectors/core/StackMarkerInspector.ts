import * as vscode from "vscode";
import type { WorkspaceSnapshot } from "@control-agent/contracts";
import { findWorkspaceMarkerFiles } from "../fs/findWorkspaceMarkerFiles";
import type { InspectionContext, WorkspaceInspector } from "../types";
import {
  STACK_MARKER_DEFINITIONS,
  inferStackSignals
} from "./stackMarkers";

/**
 * Read-only inspector for workspace stack markers.
 *
 * This slice only looks for the marker families explicitly listed in the plan:
 * - package.json
 * - tsconfig.json
 * - pyproject.toml
 * - requirements.txt
 * - .eslintrc*
 * - .prettierrc*
 *
 * It does not parse arbitrary manifests deeply.
 */
export class StackMarkerInspector implements WorkspaceInspector {
  public readonly id = "stackMarkers";

  public async inspect(
    context: InspectionContext
  ): Promise<Partial<WorkspaceSnapshot>> {
    const detectedMarkers: string[] = [];
    const relevantFiles: string[] = [];
    const notes: string[] = [];

    /**
     * Use a Set for internal dedupe during collection.
     * Final snapshot merge will also dedupe globally.
     */
    const foundMarkerIds = new Set<string>();

    for (const workspaceFolder of context.workspaceFolders) {
      const folderFoundMarkerIds: string[] = [];

      for (const definition of STACK_MARKER_DEFINITIONS) {
        const matches = await findWorkspaceMarkerFiles(
          workspaceFolder,
          definition.pattern,
          10
        );

        if (matches.length === 0) {
          continue;
        }

        foundMarkerIds.add(definition.id);
        folderFoundMarkerIds.push(definition.id);
        detectedMarkers.push(definition.detectedMarker);

        /**
         * Store the concrete files we found so later UI can explain
         * why a stack/tool guess was made.
         */
        for (const match of matches) {
          relevantFiles.push(vscode.workspace.asRelativePath(match, false));
        }
      }

      /**
       * Per-folder note helps later when multi-root workspaces are open.
       */
      if (folderFoundMarkerIds.length > 0) {
        notes.push(
          `Detected marker files in workspace folder "${workspaceFolder.name}": ${folderFoundMarkerIds.join(
            ", "
          )}.`
        );
      }
    }

    /**
     * Add inferred stack/tool markers after raw file markers are known.
     */
    const inferred = inferStackSignals(foundMarkerIds);

    /**
     * Extra note for mixed workspaces.
     */
    if (
      foundMarkerIds.has("pyprojectToml") ||
      foundMarkerIds.has("requirementsTxt")
    ) {
      if (
        foundMarkerIds.has("tsconfigJson") ||
        foundMarkerIds.has("eslintConfig") ||
        foundMarkerIds.has("prettierConfig") ||
        foundMarkerIds.has("packageJson")
      ) {
        notes.push(
          "Detected both Python and JS/TS signals across the current workspace context."
        );
      }
    }

    return {
      detectedMarkers: [...detectedMarkers, ...inferred.detectedMarkers],
      relevantFiles,
      notes: [...notes, ...inferred.notes]
    };
  }
}