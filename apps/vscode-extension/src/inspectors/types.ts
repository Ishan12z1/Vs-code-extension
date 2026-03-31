/*Every inspector must accept the same context and return a partial snapshot.*/

import * as vscode from "vscode";
import type { WorkspaceSnapshot } from "@control-agent/contracts";
import type { ExtensionRuntime } from "../state/runtime";

/**
 * Small shared context passed to every inspector
 */
export interface InspectionContext {
  runtime: ExtensionRuntime;
  workspaceFolders: readonly vscode.WorkspaceFolder[];
  workspaceFile: vscode.Uri | undefined;
}

/**
 * Inspectors do read only collection.
 * They return partial snapshot not the whole things.
 */
export interface WorkspaceInspector {
  readonly id: string;
  inspect(context: InspectionContext): Promise<Partial<WorkspaceSnapshot>>;
}
