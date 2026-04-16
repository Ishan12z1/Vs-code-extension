import type { KeybindingSignal } from "@control-agent/contracts";

/**
 * Minimal descriptor for one relevant VS Code command we want to inspect.
 */
export interface RelevantCommandDescriptor {
  readonly command: string;
  readonly note: string;
}

/**
 * Result of keybinding-related inspection.
 *
 * Why this helper exists:
 * - keeps the VS Code-dependent inspector thin
 * - makes the keybinding signal logic unit-testable
 * - centralizes the "what can we honestly say?" logic in one place
 */
export interface KeybindingInspectionResult {
  readonly keybindingSignals: KeybindingSignal[];
  readonly notes: string[];
}

/**
 * Builds richer keybinding-related signals from the available command set.
 *
 * Important honesty rule:
 * - VS Code does not expose a stable public API for resolving the final active
 *   keybinding for each command in the current environment
 * - because of that, keybinding remains null for now
 * - we still improve diagnostics by giving better per-command notes
 */
export function buildKeybindingSignals(
  relevantCommands: readonly RelevantCommandDescriptor[],
  availableCommands: ReadonlySet<string>
): KeybindingInspectionResult {
  const keybindingSignals: KeybindingSignal[] = relevantCommands.map((item) => {
    const available = availableCommands.has(item.command);

    return {
      command: item.command,
      available,
      keybinding: null,
      note: available
        ? `${item.note} Command is available, but the effective current keybinding is not exposed through a stable VS Code API, so the binding remains unresolved in this slice.`
        : `${item.note} Command is not currently available; the related feature or extension may be missing, inactive, or not yet loaded.`,
    };
  });

  const unavailableCount = keybindingSignals.filter(
    (signal) => !signal.available
  ).length;

  const notes: string[] = [
    "Relevant VS Code commands were checked for availability.",
    "Effective current keybindings remain unresolved because VS Code does not expose a stable public API for reading the final active keybinding set.",
  ];

  if (unavailableCount > 0) {
    notes.push(
      `${unavailableCount} relevant command(s) were unavailable during inspection.`
    );
  } else {
    notes.push("All relevant commands were available during inspection.");
  }

  return {
    keybindingSignals,
    notes,
  };
}
