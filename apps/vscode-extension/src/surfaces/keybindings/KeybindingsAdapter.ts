import { isDeepStrictEqual } from "node:util";
import type {
  ActionPreview,
  RollbackSnapshot,
  SurfaceAction,
  SurfaceState,
  VerificationResult,
} from "@control-agent/contracts";
import { parse, type ParseError, printParseErrorCode } from "jsonc-parser";
import type { ExtensionRuntime } from "../../state/runtime";
import type { SurfaceAdapter } from "../base/SurfaceAdapter";
import type { KeybindingEntry, KeybindingsHost } from "./keybindingsHost";

/**
 * Parsed keybindings file state.
 *
 * Why this helper exists:
 * - keeps parsing concerns separate from adapter lifecycle methods
 * - lets preview/apply/verify work from one normalized representation
 */
interface ParsedKeybindingsState {
  readonly exists: boolean;
  readonly text: string | null;
  readonly entries: KeybindingEntry[];
  readonly parseError: string | null;
}

/**
 * Surface adapter for user/global keybindings.
 *
 * Important design note:
 * - VS Code does not expose the same clean mutation API for keybindings
 *   that it exposes for settings
 * - therefore this adapter is intentionally file-backed
 * - the adapter owns the mutation logic, while the host owns file access
 */
export class KeybindingsAdapter implements SurfaceAdapter {
  public readonly surfaceName = "keybindings" as const;

  public constructor(
    private readonly runtime: ExtensionRuntime,
    private readonly keybindingsHost: KeybindingsHost
  ) {}

  /**
   * Inspect the current keybindings surface.
   *
   * Target behavior:
   * - target "*" or omitted => return all entries
   * - target "<commandId>"   => return entries for that command only
   */
  public async inspect(target?: string): Promise<SurfaceState> {
    const parsed = await this.readParsedState();
    const commandTarget = (target ?? "*").trim() || "*";

    const filteredEntries =
      commandTarget === "*"
        ? parsed.entries
        : parsed.entries.filter((entry) => entry.command === commandTarget);

    return {
      surface: this.surfaceName,
      target: commandTarget,
      exists: parsed.exists,
      data: {
        entries: filteredEntries,
      },
      metadata: {
        targetLabel: this.keybindingsHost.getTargetLabel(),
        parseStatus: parsed.parseError
          ? "invalid_jsonc"
          : parsed.exists
            ? "parsed"
            : "not_found",
        parseError: parsed.parseError,
        entryCount: filteredEntries.length,
        totalEntryCount: parsed.entries.length,
      },
      collectedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a human-readable preview of the requested keybinding mutation.
   *
   * Supported operations in this phase:
   * - upsertBinding
   * - removeBinding
   */
  public async preview(action: SurfaceAction): Promise<ActionPreview> {
    this.assertActionMatchesSurface(action);

    const parsed = await this.readParsedState();

    if (parsed.parseError) {
      throw new Error(
        `Cannot preview keybindings action because the current file is invalid JSONC: ${parsed.parseError}`
      );
    }

    const beforeEntries = this.findMatchingEntries(parsed.entries, action);
    const afterEntries = this.computeNextEntries(parsed.entries, action).filter(
      (entry) => this.matchesAction(entry, action)
    );

    return {
      summary: this.buildPreviewSummary(action),
      targetLabel: `Keybinding command: ${action.target}`,
      before: beforeEntries,
      after: afterEntries,
      diffText: this.buildDiffText(beforeEntries, afterEntries),
      warnings: this.detectConflicts(parsed.entries, action),
    };
  }

  /**
   * Apply the requested keybindings mutation.
   *
   * For this phase, we rewrite the normalized JSON array content.
   * That keeps the implementation simple and deterministic.
   *
   * Honest limitation:
   * - this does not preserve comments/formatting perfectly
   * - if preserving comments becomes important later, we should switch
   *   to a patch/edit-based JSONC strategy
   */
  public async apply(action: SurfaceAction): Promise<void> {
    this.assertActionMatchesSurface(action);

    const parsed = await this.readParsedState();

    if (parsed.parseError) {
      throw new Error(
        `Cannot apply keybindings action because the current file is invalid JSONC: ${parsed.parseError}`
      );
    }

    const nextEntries = this.computeNextEntries(parsed.entries, action);

    this.runtime.output.appendLine(
      `[surfaces] applying keybindings action ${action.operation} for ${action.target}`
    );

    await this.keybindingsHost.writeText(this.serializeEntries(nextEntries));
  }

  /**
   * Verify that the expected keybindings state now exists.
   */
  public async verify(action: SurfaceAction): Promise<VerificationResult> {
    this.assertActionMatchesSurface(action);

    const parsed = await this.readParsedState();

    if (parsed.parseError) {
      return {
        surface: this.surfaceName,
        status: "failed",
        success: false,
        message: `Keybindings file is invalid JSONC: ${parsed.parseError}`,
        details: {},
        warnings: [],
        verifiedAt: new Date().toISOString(),
      };
    }

    let success = false;

    if (action.operation === "removeBinding") {
      success = this.findMatchingEntries(parsed.entries, action).length === 0;
    } else {
      const desiredEntry = this.buildDesiredEntry(action);
      success = parsed.entries.some((entry) =>
        this.isSameKeybindingEntry(entry, desiredEntry)
      );
    }

    return {
      surface: this.surfaceName,
      status: success ? "verified" : "mismatch",
      success,
      message: success
        ? `Keybindings mutation for "${action.target}" verified successfully.`
        : `Keybindings mutation for "${action.target}" does not match the expected final state.`,
      details: {
        actionOperation: action.operation,
        targetCommand: action.target,
      },
      warnings: [],
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Restore the previous keybindings file state from a rollback snapshot.
   *
   * Expected snapshot payload shape:
   * {
   *   previousText: string | null
   * }
   *
   * If previousText is null, the prior state was "no keybindings file",
   * so rollback deletes the file.
   */
  public async rollback(snapshot: RollbackSnapshot): Promise<void> {
    if (snapshot.surface !== this.surfaceName) {
      throw new Error(
        `Snapshot surface mismatch. Expected ${this.surfaceName}, received ${snapshot.surface}.`
      );
    }

    const payload = snapshot.snapshotData as {
      previousText?: string | null;
    };

    this.runtime.output.appendLine(
      `[surfaces] rolling back keybindings for ${snapshot.target}`
    );

    if (payload.previousText == null) {
      await this.keybindingsHost.deleteFile();
      return;
    }

    await this.keybindingsHost.writeText(payload.previousText);
  }

  /**
   * Read and parse the raw keybindings file text.
   */
  private async readParsedState(): Promise<ParsedKeybindingsState> {
    const rawText = await this.keybindingsHost.readText();

    if (rawText == null) {
      return {
        exists: false,
        text: null,
        entries: [],
        parseError: null,
      };
    }

    const parseErrors: ParseError[] = [];
    const parsedValue = parse(rawText, parseErrors);

    if (parseErrors.length > 0) {
      return {
        exists: true,
        text: rawText,
        entries: [],
        parseError: parseErrors
          .map((error) => printParseErrorCode(error.error))
          .join(", "),
      };
    }

    if (!Array.isArray(parsedValue)) {
      return {
        exists: true,
        text: rawText,
        entries: [],
        parseError: "Keybindings file must contain a top-level array.",
      };
    }

    const entries = parsedValue
      .filter((value) => this.isKeybindingEntry(value))
      .map((value) => value as KeybindingEntry);

    return {
      exists: true,
      text: rawText,
      entries,
      parseError: null,
    };
  }

  /**
   * Ensure the generic surface action really targets the keybindings surface.
   */
  private assertActionMatchesSurface(action: SurfaceAction): void {
    if (action.surface !== this.surfaceName) {
      throw new Error(
        `Action surface mismatch. Expected ${this.surfaceName}, received ${action.surface}.`
      );
    }

    if (action.target.trim().length === 0) {
      throw new Error(
        "Keybindings action target must be a non-empty command id."
      );
    }

    if (
      action.operation !== "upsertBinding" &&
      action.operation !== "removeBinding"
    ) {
      throw new Error(
        `Unsupported keybindings action operation: ${action.operation}`
      );
    }
  }

  /**
   * Build the desired keybinding entry for an upsert action.
   *
   * Required params for upsertBinding:
   * - key
   *
   * Optional params:
   * - when
   * - args
   */
  private buildDesiredEntry(action: SurfaceAction): KeybindingEntry {
    if (action.operation !== "upsertBinding") {
      throw new Error(
        `Cannot build desired keybinding entry for operation ${action.operation}.`
      );
    }

    const key = action.params.key;

    if (typeof key !== "string" || key.trim().length === 0) {
      throw new Error(
        `Keybindings upsert requires params.key for command "${action.target}".`
      );
    }

    const when =
      typeof action.params.when === "string" &&
      action.params.when.trim().length > 0
        ? action.params.when
        : undefined;

    const entry: {
      key: string;
      command: string;
      when?: string;
      args?: unknown;
    } = {
      key,
      command: action.target,
    };

    /**
     * Only include optional fields when they are actually present.
     *
     * Why:
     * - JSON serialization drops undefined values
     * - verify() should compare normalized shapes, not object artifacts
     */
    if (when !== undefined) {
      entry.when = when;
    }

    if ("args" in action.params) {
      entry.args = action.params.args;
    }

    return entry;
  }

  /**
   * Compute the full next keybindings list after applying one action.
   */
  private computeNextEntries(
    currentEntries: KeybindingEntry[],
    action: SurfaceAction
  ): KeybindingEntry[] {
    if (action.operation === "removeBinding") {
      return currentEntries.filter(
        (entry) => !this.matchesAction(entry, action)
      );
    }

    const desiredEntry = this.buildDesiredEntry(action);

    const nextEntries = [...currentEntries];
    const existingIndex = nextEntries.findIndex((entry) =>
      this.matchesAction(entry, action)
    );

    if (existingIndex >= 0) {
      nextEntries[existingIndex] = desiredEntry;
      return nextEntries;
    }

    nextEntries.push(desiredEntry);
    return nextEntries;
  }

  /**
   * Find entries that match the action's logical identity.
   *
   * Matching rule for this phase:
   * - same command
   * - same "when" if provided in the action
   * - if no when is provided, match all entries for the command
   *
   * This is a practical V1 compromise. It is simple and predictable.
   */
  private findMatchingEntries(
    entries: KeybindingEntry[],
    action: SurfaceAction
  ): KeybindingEntry[] {
    return entries.filter((entry) => this.matchesAction(entry, action));
  }

  /**
   * Decide whether one keybinding entry matches the action target.
   */
  private matchesAction(
    entry: KeybindingEntry,
    action: SurfaceAction
  ): boolean {
    if (entry.command !== action.target) {
      return false;
    }

    const requestedWhen =
      typeof action.params.when === "string" &&
      action.params.when.trim().length > 0
        ? action.params.when
        : undefined;

    if (requestedWhen === undefined) {
      return true;
    }

    return entry.when === requestedWhen;
  }

  /**
   * Detect simple key conflicts for preview warnings.
   *
   * V1 rule:
   * - if upserting a binding with a key already used by another command,
   *   warn about it
   */
  private detectConflicts(
    entries: KeybindingEntry[],
    action: SurfaceAction
  ): string[] {
    if (action.operation !== "upsertBinding") {
      return [];
    }

    const desiredEntry = this.buildDesiredEntry(action);

    const conflictingEntries = entries.filter(
      (entry) =>
        entry.key === desiredEntry.key && entry.command !== desiredEntry.command
    );

    return conflictingEntries.map(
      (entry) =>
        `Potential conflict: key "${entry.key}" is already used by command "${entry.command}".`
    );
  }

  /**
   * Serialize the normalized entries back into the keybindings file.
   */
  private serializeEntries(entries: KeybindingEntry[]): string {
    return `${JSON.stringify(entries, null, 2)}\n`;
  }

  /**
   * Build a small human-readable preview summary.
   */
  private buildPreviewSummary(action: SurfaceAction): string {
    if (action.operation === "removeBinding") {
      return `Remove keybinding for command "${action.target}".`;
    }

    return `Add or replace keybinding for command "${action.target}".`;
  }

  /**
   * Build a small diff string for preview output.
   */
  private buildDiffText(
    beforeEntries: KeybindingEntry[],
    afterEntries: KeybindingEntry[]
  ): string {
    return `${this.stringifyValue(beforeEntries)} -> ${this.stringifyValue(afterEntries)}`;
  }

  /**
   * Compare two normalized keybinding entries deeply.
   */
  private isSameKeybindingEntry(
    left: KeybindingEntry,
    right: KeybindingEntry
  ): boolean {
    return isDeepStrictEqual(left, right);
  }

  /**
   * Convert a value into a readable one-line preview string.
   */
  private stringifyValue(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  /**
   * Narrow an unknown parsed JSON value into a keybinding entry.
   */
  private isKeybindingEntry(value: unknown): value is KeybindingEntry {
    if (typeof value !== "object" || value == null) {
      return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
      typeof candidate.key === "string" &&
      candidate.key.trim().length > 0 &&
      typeof candidate.command === "string" &&
      candidate.command.trim().length > 0
    );
  }
}
