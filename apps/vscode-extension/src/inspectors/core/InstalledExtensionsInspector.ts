//This inspector checks set of target extensions.
import * as vscode from "vscode";
import type { InspectionContext, WorkspaceInspector } from "../types";
import { TARGET_EXTENSION_IDS } from "./relevantVscodeSignals";

/**
 * Reads selected extension state for the V1 extension targets.
 *
 * We only inspect a bounded set because the product should support
 * a few extension ecosystems well instead of pretending to support all.
 */
export class InstalledExtensionsInspector implements WorkspaceInspector {
  public readonly id = "installedExtensions";

  public async inspect(
    _context: InspectionContext
  ): Promise<{
    installedTargetExtensions: Array<{
      id: string;
      installed: boolean;
      version: string | null;
      isActive: boolean;
    }>;
  }> {
    const installedTargetExtensions = TARGET_EXTENSION_IDS.map((id) => {
      const extension = vscode.extensions.getExtension(id);

      return {
        id,
        installed: Boolean(extension),
        version:
          typeof extension?.packageJSON?.version === "string"
            ? extension.packageJSON.version
            : null,
        isActive: extension?.isActive ?? false
      };
    });

    return { installedTargetExtensions };
  }
}
