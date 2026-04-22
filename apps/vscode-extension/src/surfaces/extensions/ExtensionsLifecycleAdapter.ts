import { isDeepStrictEqual } from "node:util";
import type {
  ActionPreview,
  RollbackSnapshot,
  SurfaceAction,
  SurfaceState,
  VerificationResult,
} from "@control-agent/contracts";
import type { ExtensionRuntime } from "../../state/runtime";
import type { SurfaceAdapter } from "../base/SurfaceAdapter";
import type { ExtensionLifecycleState, ExtensionsHost } from "./extensionsHost";

/**
 * Surface adapter for extension lifecycle operations.
 *
 * Supported operations in this phase:
 * - installExtension
 * - updateExtension
 * - enableExtension
 * - disableExtension
 * - uninstallExtension
 *
 * Important:
 * - this adapter owns lifecycle semantics
 * - the host owns environment-specific execution details
 */
export class ExtensionsLifecycleAdapter implements SurfaceAdapter {
  public readonly surfaceName = "extensionsLifecycle" as const;

  public constructor(
    private readonly runtime: ExtensionRuntime,
    private readonly extensionsHost: ExtensionsHost
  ) {}

  /**
   * Inspect extension lifecycle state.
   *
   * Target behavior:
   * - target "*" or omitted => list all installed extensions
   * - target "<publisher.name>" => inspect one extension
   */
  public async inspect(target?: string): Promise<SurfaceState> {
    const normalizedTarget = (target ?? "*").trim() || "*";

    if (normalizedTarget === "*") {
      const extensions = await this.extensionsHost.listInstalledExtensions();

      return {
        surface: this.surfaceName,
        target: "*",
        exists: true,
        data: {
          extensions,
        },
        metadata: {
          count: extensions.length,
        },
        collectedAt: new Date().toISOString(),
      };
    }

    const extensionState =
      await this.extensionsHost.inspectExtension(normalizedTarget);

    return {
      surface: this.surfaceName,
      target: normalizedTarget,
      exists: true,
      data: {
        extension: extensionState,
      },
      metadata: {},
      collectedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a preview of the requested lifecycle action.
   */
  public async preview(action: SurfaceAction): Promise<ActionPreview> {
    this.assertActionMatchesSurface(action);

    const beforeState = await this.extensionsHost.inspectExtension(
      action.target
    );
    const afterState = this.computeExpectedState(beforeState, action);

    return {
      summary: this.buildPreviewSummary(action),
      targetLabel: `Extension: ${action.target}`,
      before: beforeState,
      after: afterState,
      diffText: `${this.stringifyValue(beforeState)} -> ${this.stringifyValue(
        afterState
      )}`,
      warnings: this.buildWarnings(beforeState, action),
    };
  }

  /**
   * Apply the requested lifecycle action through the host.
   */
  public async apply(action: SurfaceAction): Promise<void> {
    this.assertActionMatchesSurface(action);

    this.runtime.output.appendLine(
      `[surfaces] applying extensions lifecycle action ${action.operation} for ${action.target}`
    );

    const version = this.getRequestedVersion(action);

    switch (action.operation) {
      case "installExtension":
        await this.extensionsHost.installExtension(action.target, version);
        return;

      case "updateExtension":
        await this.extensionsHost.updateExtension(action.target, version);
        return;

      case "enableExtension":
        await this.extensionsHost.enableExtension(action.target);
        return;

      case "disableExtension":
        await this.extensionsHost.disableExtension(action.target);
        return;

      case "uninstallExtension":
        await this.extensionsHost.uninstallExtension(action.target);
        return;
    }
  }

  /**
   * Verify that the extension state matches the expected post-action state.
   */
  public async verify(action: SurfaceAction): Promise<VerificationResult> {
    this.assertActionMatchesSurface(action);

    const actualState = await this.extensionsHost.inspectExtension(
      action.target
    );
    const expectedState = this.computeExpectedState(actualState, action);

    let success = false;

    /**
     * For updateExtension we allow two levels of verification:
     * - if a target version was requested, the version must match
     * - otherwise, installed=true is enough for this phase
     */
    if (action.operation === "updateExtension") {
      const requestedVersion = this.getRequestedVersion(action);

      success =
        actualState.installed === true &&
        (requestedVersion === undefined ||
          actualState.version === requestedVersion);
    } else {
      success = isDeepStrictEqual(actualState, expectedState);
    }

    return {
      surface: this.surfaceName,
      status: success ? "verified" : "mismatch",
      success,
      message: success
        ? `Extension lifecycle action for "${action.target}" verified successfully.`
        : `Extension lifecycle action for "${action.target}" does not match the expected final state.`,
      details: {
        expectedState,
        actualState,
      },
      warnings: [],
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Restore the previous extension state from a rollback snapshot.
   *
   * Expected snapshot payload shape:
   * {
   *   previousState: ExtensionLifecycleState
   * }
   *
   * Rollback logic for this phase:
   * - restore installed/not-installed state
   * - then restore enabled/disabled state if installed
   *
   * Honest note:
   * - version-specific rollback is only honored if previousState.version exists
   * - otherwise rollback restores coarse lifecycle state, not exact binary parity
   */
  public async rollback(snapshot: RollbackSnapshot): Promise<void> {
    if (snapshot.surface !== this.surfaceName) {
      throw new Error(
        `Snapshot surface mismatch. Expected ${this.surfaceName}, received ${snapshot.surface}.`
      );
    }

    const payload = snapshot.snapshotData as {
      previousState?: ExtensionLifecycleState;
    };

    const previousState = payload.previousState;

    if (!previousState) {
      throw new Error(
        "Extensions rollback snapshot is missing snapshotData.previousState."
      );
    }

    this.runtime.output.appendLine(
      `[surfaces] rolling back extension lifecycle for ${snapshot.target}`
    );

    const currentState = await this.extensionsHost.inspectExtension(
      snapshot.target
    );

    /**
     * Step 1: restore installed/not-installed state.
     */
    if (!previousState.installed && currentState.installed) {
      await this.extensionsHost.uninstallExtension(snapshot.target);
      return;
    }

    if (previousState.installed && !currentState.installed) {
      await this.extensionsHost.installExtension(
        snapshot.target,
        previousState.version
      );
    }

    /**
     * Step 2: if the extension should exist, restore enabled state.
     */
    if (previousState.installed) {
      if (previousState.enabled) {
        await this.extensionsHost.enableExtension(snapshot.target);
      } else {
        await this.extensionsHost.disableExtension(snapshot.target);
      }

      /**
       * Step 3: optionally restore a specific version when one is known.
       */
      if (previousState.version) {
        await this.extensionsHost.updateExtension(
          snapshot.target,
          previousState.version
        );
      }
    }
  }

  /**
   * Validate the generic surface action for this adapter.
   */
  private assertActionMatchesSurface(action: SurfaceAction): void {
    if (action.surface !== this.surfaceName) {
      throw new Error(
        `Action surface mismatch. Expected ${this.surfaceName}, received ${action.surface}.`
      );
    }

    if (action.target.trim().length === 0) {
      throw new Error(
        "Extensions lifecycle action target must be a non-empty extension id."
      );
    }

    if (
      action.operation !== "installExtension" &&
      action.operation !== "updateExtension" &&
      action.operation !== "enableExtension" &&
      action.operation !== "disableExtension" &&
      action.operation !== "uninstallExtension"
    ) {
      throw new Error(
        `Unsupported extensions lifecycle action operation: ${action.operation}`
      );
    }
  }

  /**
   * Build the expected state after one action.
   */
  private computeExpectedState(
    beforeState: ExtensionLifecycleState,
    action: SurfaceAction
  ): ExtensionLifecycleState {
    const version = this.getRequestedVersion(action);

    switch (action.operation) {
      case "installExtension":
        return {
          extensionId: beforeState.extensionId,
          installed: true,
          enabled: true,
          version: version ?? beforeState.version,
        };

      case "updateExtension":
        return {
          ...beforeState,
          installed: true,
          version: version ?? beforeState.version,
        };

      case "enableExtension":
        return {
          ...beforeState,
          installed: true,
          enabled: true,
        };

      case "disableExtension":
        return {
          ...beforeState,
          installed: true,
          enabled: false,
        };

      case "uninstallExtension":
        return {
          extensionId: beforeState.extensionId,
          installed: false,
          enabled: false,
          version: undefined,
        };

      default:
        throw new Error(
          `Unsupported extensions lifecycle action operation: ${action.operation}`
        );
    }
  }

  /**
   * Return an optional requested version from the generic action params.
   */
  private getRequestedVersion(action: SurfaceAction): string | undefined {
    const value = action.params.version;

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }

    return undefined;
  }

  /**
   * Build human-readable preview text.
   */
  private buildPreviewSummary(action: SurfaceAction): string {
    switch (action.operation) {
      case "installExtension":
        return `Install extension "${action.target}".`;

      case "updateExtension":
        return `Update extension "${action.target}".`;

      case "enableExtension":
        return `Enable extension "${action.target}".`;

      case "disableExtension":
        return `Disable extension "${action.target}".`;

      case "uninstallExtension":
        return `Uninstall extension "${action.target}".`;

      default:
        throw new Error(
          `Unsupported extensions lifecycle action operation: ${action.operation}`
        );
    }
  }

  /**
   * Build simple warnings for lifecycle actions.
   */
  private buildWarnings(
    beforeState: ExtensionLifecycleState,
    action: SurfaceAction
  ): string[] {
    const warnings: string[] = [];

    if (action.operation === "uninstallExtension" && beforeState.installed) {
      warnings.push(
        `Uninstalling "${action.target}" may change editor behavior and remove contributed functionality.`
      );
    }

    if (
      action.operation === "disableExtension" &&
      beforeState.installed &&
      beforeState.enabled
    ) {
      warnings.push(
        `Disabling "${action.target}" may change commands, language features, or workspace behavior.`
      );
    }

    return warnings;
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
}
