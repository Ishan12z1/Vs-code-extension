/* This file runs all inspectors, merges their results, logs failures, and validates the final snapshot. */

import * as vscode from "vscode"; /* to read current workspace state */
import {
  WorkspaceSnapshotSchema /*fina; validation */,
  type WorkspaceSnapshot /*type for the build result */,
} from "@control-agent/contracts";
import type { ExtensionRuntime } from "../state/runtime"; /*logging/output access */
import { createEmptyWorkspaceSnapshot } from "./createEmptyWorkspaceSnapshot"; /*start state */
import { mergeWorkspaceSnapshot } from "./mergeWorkspaceSnapshot"; /**Combine patches  */
import type {
  InspectionContext,
  WorkspaceInspector,
} from "./types"; /**Type safety */

/**
 * Orchestrates all read-only inspectors and returns
 * one validated, normalized WorkspaceSnapshot.
 */
export class WorkspaceSnapshotBuilder {
  public constructor(
    private readonly runtime: ExtensionRuntime,
    private readonly inspectors: readonly WorkspaceInspector[]
  ) {}

  public async build(): Promise<WorkspaceSnapshot> {
    /* gathers the current VS Code workspace state once and packages it for inspectors. */
    const context: InspectionContext = {
      runtime: this.runtime,
      workspaceFolders: vscode.workspace.workspaceFolders ?? [],
      workspaceFile: vscode.workspace.workspaceFile,
    };
    let snapshot = createEmptyWorkspaceSnapshot();

    for (const inspector of this.inspectors) {
      try {
        this.runtime.output.appendLine(
          `[inspect] running inspector: ${inspector.id}`
        );

        const partialSnapshot = await inspector.inspect(context);
        snapshot = mergeWorkspaceSnapshot(snapshot, partialSnapshot);
      } catch (error) {
        /**
         * Read-only inspection should degrade gracefully.
         * One bad inspector should not kill the whole snapshot.
         */
        const message =
          error instanceof Error ? error.message : "Unknown inspector error";

        this.runtime.output.appendLine(
          `[inspect] inspector failed: ${inspector.id} -> ${message}`
        );
      }
    }
    /**
     * Final contract validation.
     * If this fails, the builder contract is broken and should fail loudly.
     */
    return WorkspaceSnapshotSchema.parse(snapshot);
  }
}
