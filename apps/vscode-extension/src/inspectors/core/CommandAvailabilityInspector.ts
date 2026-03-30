//This inspector checks whether key commands exist.


import * as vscode from "vscode";
import type { InspectionContext, WorkspaceInspector } from "../types";
import { RELEVANT_COMMANDS } from "./relevantVscodeSignals";

/**
 * Early keybinding-related inspection
 *
 * For now we record whether relevant commands are available
 */
export class CommandAvailabilityInspector implements WorkspaceInspector {
  public readonly id = "commandAvailability";

  public async inspect(
    _context: InspectionContext
  ): Promise<{
    keybindingSignals: Array<{
      command: string;
      available: boolean;
      keybinding: string | null;
      note: string | null;
    }>;
    notes: string[];
  }> {
    const availableCommands = new Set(await vscode.commands.getCommands(true));

    return {
      keybindingSignals: RELEVANT_COMMANDS.map((item) => ({
        command: item.command,
        available: availableCommands.has(item.command),
        keybinding: null,
        note: item.note
      })),
      notes: [
        "Keybinding inspection is intentionally partial in this slice; command availability is recorded first."
      ]
    };
  }
}