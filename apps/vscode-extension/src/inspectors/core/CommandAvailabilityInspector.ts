import * as vscode from "vscode";
import type { InspectionContext, WorkspaceInspector } from "../types";
import {
  buildKeybindingSignals,
  type KeybindingInspectionResult,
} from "./buildKeybindingSignals";
import { RELEVANT_COMMANDS } from "./relevantVscodeSignals";

/**
 * Keybinding-related inspection.
 *
 * E2 hardens the earlier command-availability-only slice by:
 * - keeping command availability checks
 * - attaching stronger per-command notes
 * - making the "keybinding unresolved" limitation explicit and honest
 *
 * We still do not pretend to know the final active binding for each command,
 * because VS Code does not expose that through a stable public API.
 */
export class CommandAvailabilityInspector implements WorkspaceInspector {
  public readonly id = "commandAvailability";

  public async inspect(
    _context: InspectionContext
  ): Promise<KeybindingInspectionResult> {
    const availableCommands = new Set(await vscode.commands.getCommands(true));

    return buildKeybindingSignals(RELEVANT_COMMANDS, availableCommands);
  }
}
