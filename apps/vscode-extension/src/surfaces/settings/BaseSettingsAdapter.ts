import { isDeepStrictEqual } from "node:util";
import type {
  ActionPreview,
  RollbackSnapshot,
  SurfaceAction,
  SurfaceName,
  SurfaceState,
  VerificationResult,
} from "@control-agent/contracts";
import type { ExtensionRuntime } from "../../state/runtime";
import type { SurfaceAdapter } from "../base/SurfaceAdapter";
import type {
  SettingsHost,
  SettingsInspection,
  SettingsScope,
} from "./settingsHost";

/**
 * Shared base class for settings-backed surface adapters.
 *
 * Why this exists:
 * - user settings and workspace settings follow the same lifecycle
 * - the main difference is the target scope (user vs workspace)
 * - sharing the logic keeps the adapter pattern consistent
 */
export abstract class BaseSettingsAdapter implements SurfaceAdapter {
  /**
   * Stable surface identifier implemented by the concrete adapter.
   */
  public abstract readonly surfaceName: SurfaceName;

  /**
   * Settings scope used for writes.
   */
  protected abstract readonly settingsScope: SettingsScope;

  /**
   * Human-readable label used in preview/verification output.
   */
  protected abstract readonly surfaceLabel: string;

  public constructor(
    protected readonly runtime: ExtensionRuntime,
    protected readonly settingsHost: SettingsHost
  ) {}

  /**
   * Inspect the current value of one setting key for this adapter's scope.
   */
  public async inspect(target?: string): Promise<SurfaceState> {
    const key = (target ?? "").trim();

    if (key.length === 0) {
      return {
        surface: this.surfaceName,
        target: "*",
        exists: true,
        data: {
          value: undefined,
        },
        metadata: {
          note: "No specific setting key requested.",
          scope: this.surfaceLabel,
        },
        collectedAt: new Date().toISOString(),
      };
    }

    const inspection = this.settingsHost.inspect(key);
    const scopedValue = this.readScopedValue(inspection);

    return {
      surface: this.surfaceName,
      target: key,
      exists: true,
      data: {
        value: scopedValue,
      },
      metadata: {
        scope: this.surfaceLabel,
        defaultValue: inspection?.defaultValue,
        globalValue: inspection?.globalValue,
        workspaceValue: inspection?.workspaceValue,
        workspaceFolderValue: inspection?.workspaceFolderValue,
      },
      collectedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a human-readable preview for the requested action.
   */
  public async preview(action: SurfaceAction): Promise<ActionPreview> {
    this.assertActionMatchesSurface(action);

    const currentValue = this.getCurrentValue(action.target);
    const nextValue = this.getDesiredValue(action);

    return {
      summary:
        nextValue === undefined
          ? `Unset ${this.surfaceLabel.toLowerCase()} setting "${action.target}".`
          : `Set ${this.surfaceLabel.toLowerCase()} setting "${action.target}".`,
      targetLabel: `${this.surfaceLabel}: ${action.target}`,
      before: currentValue,
      after: nextValue,
      diffText: this.buildDiffText(currentValue, nextValue),
      warnings: [],
    };
  }

  /**
   * Apply the requested mutation through the settings host.
   */
  public async apply(action: SurfaceAction): Promise<void> {
    this.assertActionMatchesSurface(action);
    this.assertWorkspaceAvailabilityIfNeeded();

    const nextValue = this.getDesiredValue(action);

    this.runtime.output.appendLine(
      `[surfaces] applying ${this.surfaceName} action for ${action.target}`
    );

    await this.settingsHost.update(
      action.target,
      nextValue,
      this.settingsScope
    );
  }

  /**
   * Verify that the requested value now matches the real value.
   */
  public async verify(action: SurfaceAction): Promise<VerificationResult> {
    this.assertActionMatchesSurface(action);

    const expectedValue = this.getDesiredValue(action);
    const actualValue = this.getCurrentValue(action.target);
    const matches = isDeepStrictEqual(actualValue, expectedValue);

    return {
      surface: this.surfaceName,
      status: matches ? "verified" : "mismatch",
      success: matches,
      message: matches
        ? `${this.surfaceLabel} setting "${action.target}" matches the expected value.`
        : `${this.surfaceLabel} setting "${action.target}" does not match the expected value.`,
      details: {
        expectedValue,
        actualValue,
      },
      warnings: [],
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Restore prior state from a rollback snapshot.
   */
  public async rollback(snapshot: RollbackSnapshot): Promise<void> {
    if (snapshot.surface !== this.surfaceName) {
      throw new Error(
        `Snapshot surface mismatch. Expected ${this.surfaceName}, received ${snapshot.surface}.`
      );
    }

    this.assertWorkspaceAvailabilityIfNeeded();

    const payload = snapshot.snapshotData as {
      previousValue?: unknown;
    };

    const previousValue = payload?.previousValue;

    this.runtime.output.appendLine(
      `[surfaces] rolling back ${this.surfaceName} setting for ${snapshot.target}`
    );

    await this.settingsHost.update(
      snapshot.target,
      previousValue,
      this.settingsScope
    );
  }

  /**
   * Read the scope-specific value for the provided key.
   */
  protected getCurrentValue(settingKey: string): unknown {
    const inspection = this.settingsHost.inspect(settingKey);
    return this.readScopedValue(inspection);
  }

  /**
   * Read the scope-specific value from one inspection result.
   */
  protected abstract readScopedValue(
    inspection: SettingsInspection | undefined
  ): unknown;

  /**
   * Parse the desired value from one generic surface action.
   *
   * Supported operations in this phase:
   * - "set"
   * - "unset"
   */
  protected getDesiredValue(action: SurfaceAction): unknown {
    if (action.operation === "unset") {
      return undefined;
    }

    if (action.operation !== "set") {
      throw new Error(
        `Unsupported settings action operation: ${action.operation}`
      );
    }

    if (!("value" in action.params)) {
      throw new Error(
        `Missing params.value for settings action on "${action.target}".`
      );
    }

    return action.params.value;
  }

  /**
   * Validate that the action matches this adapter's surface.
   */
  protected assertActionMatchesSurface(action: SurfaceAction): void {
    if (action.surface !== this.surfaceName) {
      throw new Error(
        `Action surface mismatch. Expected ${this.surfaceName}, received ${action.surface}.`
      );
    }

    if (action.target.trim().length === 0) {
      throw new Error(
        "Settings action target must be a non-empty setting key."
      );
    }
  }

  /**
   * Workspace-targeted writes require an open workspace.
   *
   * User settings do not need that requirement, so the default implementation
   * does nothing.
   */
  protected assertWorkspaceAvailabilityIfNeeded(): void {
    // Default no-op.
  }

  /**
   * Build a small diff string for previews.
   */
  private buildDiffText(before: unknown, after: unknown): string {
    return `${this.stringifyValue(before)} -> ${this.stringifyValue(after)}`;
  }

  /**
   * Convert a value into a readable one-line string.
   */
  private stringifyValue(value: unknown): string {
    if (value === undefined) {
      return "undefined";
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
