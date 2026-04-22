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
import type { LaunchJsonHost } from "./launchJsonHost";

/**
 * One normalized launch configuration entry.
 *
 * V1 identity rule:
 * - "name" is required and is treated as the configuration identity
 */
export interface LaunchConfiguration {
  readonly name: string;
  readonly type?: string;
  readonly request?: string;
  readonly [key: string]: unknown;
}

/**
 * Normalized launch.json document shape used by the adapter.
 *
 * Why this exists:
 * - lets us preserve unknown top-level fields
 * - keeps "configurations" normalized as an array
 */
interface LaunchJsonDocument {
  readonly version?: string;
  readonly configurations: LaunchConfiguration[];
  readonly compounds?: unknown[];
  readonly [key: string]: unknown;
}

/**
 * Parsed launch.json state returned internally after file read + parse.
 */
interface ParsedLaunchState {
  readonly exists: boolean;
  readonly text: string | null;
  readonly document: LaunchJsonDocument;
  readonly parseError: string | null;
}

/**
 * Surface adapter for .vscode/launch.json.
 *
 * Supported operations in this phase:
 * - upsertLaunchConfiguration
 * - removeLaunchConfiguration
 *
 * Important:
 * - this is a file-backed JSONC adapter
 * - the adapter owns document mutation semantics
 * - the host owns file access
 */
export class LaunchJsonAdapter implements SurfaceAdapter {
  public readonly surfaceName = "launchJson" as const;

  public constructor(
    private readonly runtime: ExtensionRuntime,
    private readonly launchHost: LaunchJsonHost
  ) {}

  /**
   * Inspect the current launch.json surface.
   *
   * Target behavior:
   * - target "*" or omitted => return all configurations
   * - target "<configurationName>" => return matching configuration(s)
   */
  public async inspect(target?: string): Promise<SurfaceState> {
    const parsed = await this.readParsedState();
    const normalizedTarget = (target ?? "*").trim() || "*";

    const filteredConfigurations =
      normalizedTarget === "*"
        ? parsed.document.configurations
        : parsed.document.configurations.filter(
            (configuration) => configuration.name === normalizedTarget
          );

    return {
      surface: this.surfaceName,
      target: normalizedTarget,
      exists: parsed.exists,
      data: {
        configurations: filteredConfigurations,
      },
      metadata: {
        targetLabel: this.launchHost.getTargetLabel(),
        parseStatus: parsed.parseError
          ? "invalid_jsonc"
          : parsed.exists
            ? "parsed"
            : "not_found",
        parseError: parsed.parseError,
        configurationCount: filteredConfigurations.length,
        totalConfigurationCount: parsed.document.configurations.length,
        version: parsed.document.version,
        compoundCount: Array.isArray(parsed.document.compounds)
          ? parsed.document.compounds.length
          : 0,
      },
      collectedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a human-readable preview of the requested launch.json mutation.
   */
  public async preview(action: SurfaceAction): Promise<ActionPreview> {
    this.assertActionMatchesSurface(action);

    const parsed = await this.readParsedState();

    if (parsed.parseError) {
      throw new Error(
        `Cannot preview launch.json action because the current file is invalid JSONC: ${parsed.parseError}`
      );
    }

    const beforeConfigurations = this.findMatchingConfigurations(
      parsed.document.configurations,
      action
    );

    const afterConfigurations = this.computeNextDocument(
      parsed.document,
      action
    ).configurations.filter((configuration) =>
      this.matchesAction(configuration, action)
    );

    return {
      summary: this.buildPreviewSummary(action),
      targetLabel: `Launch configuration: ${action.target}`,
      before: beforeConfigurations,
      after: afterConfigurations,
      diffText: this.buildDiffText(beforeConfigurations, afterConfigurations),
      warnings: this.buildWarnings(parsed.document.configurations, action),
    };
  }

  /**
   * Apply the requested launch.json mutation.
   *
   * Honest limitation:
   * - this rewrites normalized JSON output
   * - comments/formatting are not preserved in this phase
   */
  public async apply(action: SurfaceAction): Promise<void> {
    this.assertActionMatchesSurface(action);

    const parsed = await this.readParsedState();

    if (parsed.parseError) {
      throw new Error(
        `Cannot apply launch.json action because the current file is invalid JSONC: ${parsed.parseError}`
      );
    }

    const nextDocument = this.computeNextDocument(parsed.document, action);

    this.runtime.output.appendLine(
      `[surfaces] applying launch.json action ${action.operation} for ${action.target}`
    );

    await this.launchHost.writeText(this.serializeDocument(nextDocument));
  }

  /**
   * Verify that launch.json now matches the expected state.
   */
  public async verify(action: SurfaceAction): Promise<VerificationResult> {
    this.assertActionMatchesSurface(action);

    const parsed = await this.readParsedState();

    if (parsed.parseError) {
      return {
        surface: this.surfaceName,
        status: "failed",
        success: false,
        message: `launch.json is invalid JSONC: ${parsed.parseError}`,
        details: {},
        warnings: [],
        verifiedAt: new Date().toISOString(),
      };
    }

    let success = false;

    if (action.operation === "removeLaunchConfiguration") {
      success =
        this.findMatchingConfigurations(parsed.document.configurations, action)
          .length === 0;
    } else {
      const desiredConfiguration = this.buildDesiredConfiguration(action);
      success = parsed.document.configurations.some((configuration) =>
        this.isSameLaunchConfiguration(configuration, desiredConfiguration)
      );
    }

    return {
      surface: this.surfaceName,
      status: success ? "verified" : "mismatch",
      success,
      message: success
        ? `launch.json mutation for "${action.target}" verified successfully.`
        : `launch.json mutation for "${action.target}" does not match the expected final state.`,
      details: {
        actionOperation: action.operation,
        targetConfigurationName: action.target,
      },
      warnings: [],
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Restore the previous launch.json file state from a rollback snapshot.
   *
   * Expected snapshot payload shape:
   * {
   *   previousText: string | null
   * }
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
      `[surfaces] rolling back launch.json for ${snapshot.target}`
    );

    if (payload.previousText == null) {
      await this.launchHost.deleteFile();
      return;
    }

    await this.launchHost.writeText(payload.previousText);
  }

  /**
   * Read and parse the raw launch.json content.
   */
  private async readParsedState(): Promise<ParsedLaunchState> {
    const rawText = await this.launchHost.readText();

    if (rawText == null) {
      return {
        exists: false,
        text: null,
        document: {
          version: "0.2.0",
          configurations: [],
        },
        parseError: null,
      };
    }

    const parseErrors: ParseError[] = [];
    const parsedValue = parse(rawText, parseErrors);

    if (parseErrors.length > 0) {
      return {
        exists: true,
        text: rawText,
        document: {
          version: "0.2.0",
          configurations: [],
        },
        parseError: parseErrors
          .map((error) => printParseErrorCode(error.error))
          .join(", "),
      };
    }

    if (
      typeof parsedValue !== "object" ||
      parsedValue == null ||
      Array.isArray(parsedValue)
    ) {
      return {
        exists: true,
        text: rawText,
        document: {
          version: "0.2.0",
          configurations: [],
        },
        parseError: "launch.json must contain a top-level object.",
      };
    }

    const root = parsedValue as Record<string, unknown>;
    const rawConfigurations = root.configurations;

    if (rawConfigurations !== undefined && !Array.isArray(rawConfigurations)) {
      return {
        exists: true,
        text: rawText,
        document: {
          version: "0.2.0",
          configurations: [],
        },
        parseError:
          'launch.json field "configurations" must be an array when present.',
      };
    }

    const normalizedConfigurations = (rawConfigurations ?? [])
      .filter((value) => this.isLaunchConfiguration(value))
      .map((value) => value as LaunchConfiguration);

    const compounds = Array.isArray(root.compounds)
      ? root.compounds
      : undefined;

    const document: LaunchJsonDocument = {
      ...root,
      version:
        typeof root.version === "string" && root.version.trim().length > 0
          ? root.version
          : "0.2.0",
      configurations: normalizedConfigurations,
      compounds,
    };

    return {
      exists: true,
      text: rawText,
      document,
      parseError: null,
    };
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
        "LaunchJson action target must be a non-empty configuration name."
      );
    }

    if (
      action.operation !== "upsertLaunchConfiguration" &&
      action.operation !== "removeLaunchConfiguration"
    ) {
      throw new Error(
        `Unsupported launch.json action operation: ${action.operation}`
      );
    }
  }

  /**
   * Build the desired launch configuration for an upsert action.
   *
   * Required params for upsertLaunchConfiguration:
   * - configuration
   *
   * The provided configuration object must include a matching name.
   */
  private buildDesiredConfiguration(
    action: SurfaceAction
  ): LaunchConfiguration {
    if (action.operation !== "upsertLaunchConfiguration") {
      throw new Error(
        `Cannot build desired launch configuration for operation ${action.operation}.`
      );
    }

    const configuration = action.params.configuration;

    if (
      typeof configuration !== "object" ||
      configuration == null ||
      Array.isArray(configuration)
    ) {
      throw new Error(
        `Launch configuration upsert requires params.configuration for "${action.target}".`
      );
    }

    const candidate = configuration as Record<string, unknown>;

    if (
      typeof candidate.name !== "string" ||
      candidate.name.trim().length === 0
    ) {
      throw new Error(
        `Launch configuration upsert requires params.configuration.name for "${action.target}".`
      );
    }

    if (candidate.name !== action.target) {
      throw new Error(
        `Launch configuration name mismatch. Action target is "${action.target}" but params.configuration.name is "${candidate.name}".`
      );
    }

    return candidate as LaunchConfiguration;
  }

  /**
   * Compute the full next launch.json document after applying one action.
   */
  private computeNextDocument(
    currentDocument: LaunchJsonDocument,
    action: SurfaceAction
  ): LaunchJsonDocument {
    const currentConfigurations = currentDocument.configurations;

    if (action.operation === "removeLaunchConfiguration") {
      return {
        ...currentDocument,
        version: currentDocument.version ?? "0.2.0",
        configurations: currentConfigurations.filter(
          (configuration) => !this.matchesAction(configuration, action)
        ),
      };
    }

    const desiredConfiguration = this.buildDesiredConfiguration(action);
    const nextConfigurations = [...currentConfigurations];
    const existingIndex = nextConfigurations.findIndex((configuration) =>
      this.matchesAction(configuration, action)
    );

    if (existingIndex >= 0) {
      nextConfigurations[existingIndex] = desiredConfiguration;
    } else {
      nextConfigurations.push(desiredConfiguration);
    }

    return {
      ...currentDocument,
      version: currentDocument.version ?? "0.2.0",
      configurations: nextConfigurations,
    };
  }

  /**
   * Find configurations that match the action target.
   *
   * V1 rule:
   * - identity is the configuration name
   */
  private findMatchingConfigurations(
    configurations: LaunchConfiguration[],
    action: SurfaceAction
  ): LaunchConfiguration[] {
    return configurations.filter((configuration) =>
      this.matchesAction(configuration, action)
    );
  }

  /**
   * Decide whether one configuration matches the action target.
   */
  private matchesAction(
    configuration: LaunchConfiguration,
    action: SurfaceAction
  ): boolean {
    return configuration.name === action.target;
  }

  /**
   * Build simple warnings for launch configuration mutations.
   */
  private buildWarnings(
    configurations: LaunchConfiguration[],
    action: SurfaceAction
  ): string[] {
    if (action.operation !== "upsertLaunchConfiguration") {
      return [];
    }

    const duplicateCount = configurations.filter(
      (configuration) => configuration.name === action.target
    ).length;

    if (duplicateCount > 1) {
      return [
        `Multiple existing launch configurations already use name "${action.target}". The adapter will replace the first matching logical configuration identity during upsert.`,
      ];
    }

    return [];
  }

  /**
   * Build a human-readable summary for preview output.
   */
  private buildPreviewSummary(action: SurfaceAction): string {
    if (action.operation === "removeLaunchConfiguration") {
      return `Remove launch configuration "${action.target}" from launch.json.`;
    }

    return `Add or replace launch configuration "${action.target}" in launch.json.`;
  }

  /**
   * Serialize the normalized document back into launch.json text.
   */
  private serializeDocument(document: LaunchJsonDocument): string {
    return `${JSON.stringify(document, null, 2)}\n`;
  }

  /**
   * Build a small diff string for preview output.
   */
  private buildDiffText(
    beforeConfigurations: LaunchConfiguration[],
    afterConfigurations: LaunchConfiguration[]
  ): string {
    return `${this.stringifyValue(beforeConfigurations)} -> ${this.stringifyValue(afterConfigurations)}`;
  }

  /**
   * Compare two normalized launch configurations deeply.
   */
  private isSameLaunchConfiguration(
    left: LaunchConfiguration,
    right: LaunchConfiguration
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
   * Narrow an unknown parsed JSON value into a launch configuration.
   *
   * V1 rule:
   * - configuration identity requires a non-empty name
   */
  private isLaunchConfiguration(value: unknown): value is LaunchConfiguration {
    if (typeof value !== "object" || value == null || Array.isArray(value)) {
      return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
      typeof candidate.name === "string" && candidate.name.trim().length > 0
    );
  }
}
