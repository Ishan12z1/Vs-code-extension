//This inspector reads selected VS Code settings.

import * as vscode from "vscode";
import type { InspectionContext, WorkspaceInspector } from "../types";
import { RELEVANT_SETTING_KEYS } from "./relevantVscodeSignals";
// import { WorkspaceSnapshot } from "@control-agent/contracts";

/**
 * Reads selected VS Code settings relevant to V1.
 *
 * Important:
 * - this is read-only
 * - this only captures user + workspace scope
 * - folder-specific scope can come later if needed
 */

export class SettingsInspector implements WorkspaceInspector {
  public readonly id = "setting";

  public async inspect(_context: InspectionContext): Promise<{
    relevantUserSettings: Record<string, unknown>;
    relevantWorkspaceSettings: Record<string, unknown>;
  }> {
    const configuration = vscode.workspace.getConfiguration();

    const relevantUserSettings: Record<string, unknown> = {};
    const relevantWorkspaceSettings: Record<string, unknown> = {};
    for (const key of RELEVANT_SETTING_KEYS) {
      /*
       * inspect() lets us see different scopes cleanly.
       */
      const inspeced = configuration.inspect<unknown>(key);

      if (inspeced?.globalValue !== undefined) {
        relevantUserSettings[key] = inspeced.globalValue;
      }
      if (inspeced?.workspaceValue !== undefined) {
        relevantWorkspaceSettings[key] = inspeced.workspaceValue;
      }
    }

    return {
      relevantUserSettings,
      relevantWorkspaceSettings,
    };
  }
}
