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
import type { TasksJsonHost } from "./tasksJsonHost";

/**
 * One normalized VS Code task entry.
 *
 * We keep this narrow but flexible:
 * - label is required for task identity in this adapter
 * - the rest of the task payload stays open because tasks.json is flexible
 */
export interface TaskDefinition {
  readonly label: string;
  readonly type?: string;
  readonly command?: string;
  readonly [key: string]: unknown;
}

/**
 * Normalized tasks.json document shape used by the adapter.
 *
 * Why this exists:
 * - lets us preserve unknown top-level fields
 * - keeps "tasks" normalized as an array
 */
interface TasksJsonDocument {
  readonly version?: string;
  readonly tasks: TaskDefinition[];
  readonly [key: string]: unknown;
}

/**
 * Parsed tasks.json state returned internally after file read + parse.
 */
interface ParsedTasksState {
  readonly exists: boolean;
  readonly text: string | null;
  readonly document: TasksJsonDocument;
  readonly parseError: string | null;
}

/**
 * Surface adapter for .vscode/tasks.json.
 *
 * Supported operations in this phase:
 * - upsertTask
 * - removeTask
 *
 * Important:
 * - this is a file-backed JSONC adapter
 * - the adapter owns document mutation semantics
 * - the host owns file access
 */
export class TasksJsonAdapter implements SurfaceAdapter {
  public readonly surfaceName = "tasksJson" as const;

  public constructor(
    private readonly runtime: ExtensionRuntime,
    private readonly tasksHost: TasksJsonHost
  ) {}

  /**
   * Inspect the current tasks surface.
   *
   * Target behavior:
   * - target "*" or omitted => return all tasks
   * - target "<taskLabel>"  => return matching task(s)
   */
  public async inspect(target?: string): Promise<SurfaceState> {
    const parsed = await this.readParsedState();
    const normalizedTarget = (target ?? "*").trim() || "*";

    const filteredTasks =
      normalizedTarget === "*"
        ? parsed.document.tasks
        : parsed.document.tasks.filter(
            (task) => task.label === normalizedTarget
          );

    return {
      surface: this.surfaceName,
      target: normalizedTarget,
      exists: parsed.exists,
      data: {
        tasks: filteredTasks,
      },
      metadata: {
        targetLabel: this.tasksHost.getTargetLabel(),
        parseStatus: parsed.parseError
          ? "invalid_jsonc"
          : parsed.exists
            ? "parsed"
            : "not_found",
        parseError: parsed.parseError,
        taskCount: filteredTasks.length,
        totalTaskCount: parsed.document.tasks.length,
        version: parsed.document.version,
      },
      collectedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a human-readable preview of the requested tasks.json mutation.
   */
  public async preview(action: SurfaceAction): Promise<ActionPreview> {
    this.assertActionMatchesSurface(action);

    const parsed = await this.readParsedState();

    if (parsed.parseError) {
      throw new Error(
        `Cannot preview tasks.json action because the current file is invalid JSONC: ${parsed.parseError}`
      );
    }

    const beforeTasks = this.findMatchingTasks(parsed.document.tasks, action);
    const afterTasks = this.computeNextDocument(
      parsed.document,
      action
    ).tasks.filter((task) => this.matchesAction(task, action));

    return {
      summary: this.buildPreviewSummary(action),
      targetLabel: `Task label: ${action.target}`,
      before: beforeTasks,
      after: afterTasks,
      diffText: this.buildDiffText(beforeTasks, afterTasks),
      warnings: this.buildWarnings(parsed.document.tasks, action),
    };
  }

  /**
   * Apply the requested tasks.json mutation.
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
        `Cannot apply tasks.json action because the current file is invalid JSONC: ${parsed.parseError}`
      );
    }

    const nextDocument = this.computeNextDocument(parsed.document, action);

    this.runtime.output.appendLine(
      `[surfaces] applying tasks.json action ${action.operation} for ${action.target}`
    );

    await this.tasksHost.writeText(this.serializeDocument(nextDocument));
  }

  /**
   * Verify that tasks.json now matches the expected state.
   */
  public async verify(action: SurfaceAction): Promise<VerificationResult> {
    this.assertActionMatchesSurface(action);

    const parsed = await this.readParsedState();

    if (parsed.parseError) {
      return {
        surface: this.surfaceName,
        status: "failed",
        success: false,
        message: `tasks.json is invalid JSONC: ${parsed.parseError}`,
        details: {},
        warnings: [],
        verifiedAt: new Date().toISOString(),
      };
    }

    let success = false;

    if (action.operation === "removeTask") {
      success =
        this.findMatchingTasks(parsed.document.tasks, action).length === 0;
    } else {
      const desiredTask = this.buildDesiredTask(action);
      success = parsed.document.tasks.some((task) =>
        this.isSameTaskDefinition(task, desiredTask)
      );
    }

    return {
      surface: this.surfaceName,
      status: success ? "verified" : "mismatch",
      success,
      message: success
        ? `tasks.json mutation for "${action.target}" verified successfully.`
        : `tasks.json mutation for "${action.target}" does not match the expected final state.`,
      details: {
        actionOperation: action.operation,
        targetTaskLabel: action.target,
      },
      warnings: [],
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Restore the previous tasks.json file state from a rollback snapshot.
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
      `[surfaces] rolling back tasks.json for ${snapshot.target}`
    );

    if (payload.previousText == null) {
      await this.tasksHost.deleteFile();
      return;
    }

    await this.tasksHost.writeText(payload.previousText);
  }

  /**
   * Read and parse the raw tasks.json content.
   */
  private async readParsedState(): Promise<ParsedTasksState> {
    const rawText = await this.tasksHost.readText();

    if (rawText == null) {
      return {
        exists: false,
        text: null,
        document: {
          version: "2.0.0",
          tasks: [],
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
          version: "2.0.0",
          tasks: [],
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
          version: "2.0.0",
          tasks: [],
        },
        parseError: "tasks.json must contain a top-level object.",
      };
    }

    const root = parsedValue as Record<string, unknown>;
    const rawTasks = root.tasks;

    if (rawTasks !== undefined && !Array.isArray(rawTasks)) {
      return {
        exists: true,
        text: rawText,
        document: {
          version: "2.0.0",
          tasks: [],
        },
        parseError: 'tasks.json field "tasks" must be an array when present.',
      };
    }

    const normalizedTasks = (rawTasks ?? [])
      .filter((value) => this.isTaskDefinition(value))
      .map((value) => value as TaskDefinition);

    const document: TasksJsonDocument = {
      ...root,
      version:
        typeof root.version === "string" && root.version.trim().length > 0
          ? root.version
          : "2.0.0",
      tasks: normalizedTasks,
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
        "TasksJson action target must be a non-empty task label."
      );
    }

    if (
      action.operation !== "upsertTask" &&
      action.operation !== "removeTask"
    ) {
      throw new Error(
        `Unsupported tasks.json action operation: ${action.operation}`
      );
    }
  }

  /**
   * Build the desired task payload for an upsert action.
   *
   * Required params for upsertTask:
   * - task
   *
   * The provided task object must include a matching label.
   */
  private buildDesiredTask(action: SurfaceAction): TaskDefinition {
    if (action.operation !== "upsertTask") {
      throw new Error(
        `Cannot build desired task for operation ${action.operation}.`
      );
    }

    const task = action.params.task;

    if (typeof task !== "object" || task == null || Array.isArray(task)) {
      throw new Error(
        `Tasks upsert requires params.task for task "${action.target}".`
      );
    }

    const candidate = task as Record<string, unknown>;

    if (
      typeof candidate.label !== "string" ||
      candidate.label.trim().length === 0
    ) {
      throw new Error(
        `Tasks upsert requires params.task.label for task "${action.target}".`
      );
    }

    if (candidate.label !== action.target) {
      throw new Error(
        `Task label mismatch. Action target is "${action.target}" but params.task.label is "${candidate.label}".`
      );
    }

    return candidate as TaskDefinition;
  }

  /**
   * Compute the full next tasks.json document after applying one action.
   */
  private computeNextDocument(
    currentDocument: TasksJsonDocument,
    action: SurfaceAction
  ): TasksJsonDocument {
    const currentTasks = currentDocument.tasks;

    if (action.operation === "removeTask") {
      return {
        ...currentDocument,
        version: currentDocument.version ?? "2.0.0",
        tasks: currentTasks.filter((task) => !this.matchesAction(task, action)),
      };
    }

    const desiredTask = this.buildDesiredTask(action);
    const nextTasks = [...currentTasks];
    const existingIndex = nextTasks.findIndex((task) =>
      this.matchesAction(task, action)
    );

    if (existingIndex >= 0) {
      nextTasks[existingIndex] = desiredTask;
    } else {
      nextTasks.push(desiredTask);
    }

    return {
      ...currentDocument,
      version: currentDocument.version ?? "2.0.0",
      tasks: nextTasks,
    };
  }

  /**
   * Find tasks that match the action target.
   *
   * V1 rule:
   * - identity is the task label
   */
  private findMatchingTasks(
    tasks: TaskDefinition[],
    action: SurfaceAction
  ): TaskDefinition[] {
    return tasks.filter((task) => this.matchesAction(task, action));
  }

  /**
   * Decide whether one task matches the action target.
   */
  private matchesAction(task: TaskDefinition, action: SurfaceAction): boolean {
    return task.label === action.target;
  }

  /**
   * Build simple warnings for task mutations.
   */
  private buildWarnings(
    tasks: TaskDefinition[],
    action: SurfaceAction
  ): string[] {
    if (action.operation !== "upsertTask") {
      return [];
    }

    const duplicateCount = tasks.filter(
      (task) => task.label === action.target
    ).length;

    if (duplicateCount > 1) {
      return [
        `Multiple existing tasks already use label "${action.target}". The adapter will replace the first matching logical task identity during upsert.`,
      ];
    }

    return [];
  }

  /**
   * Build a human-readable summary for preview output.
   */
  private buildPreviewSummary(action: SurfaceAction): string {
    if (action.operation === "removeTask") {
      return `Remove task "${action.target}" from tasks.json.`;
    }

    return `Add or replace task "${action.target}" in tasks.json.`;
  }

  /**
   * Serialize the normalized document back into tasks.json text.
   */
  private serializeDocument(document: TasksJsonDocument): string {
    return `${JSON.stringify(document, null, 2)}\n`;
  }

  /**
   * Build a small diff string for preview output.
   */
  private buildDiffText(
    beforeTasks: TaskDefinition[],
    afterTasks: TaskDefinition[]
  ): string {
    return `${this.stringifyValue(beforeTasks)} -> ${this.stringifyValue(afterTasks)}`;
  }

  /**
   * Compare two normalized task objects deeply.
   */
  private isSameTaskDefinition(
    left: TaskDefinition,
    right: TaskDefinition
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
   * Narrow an unknown parsed JSON value into a task definition.
   *
   * V1 rule:
   * - task identity requires a non-empty label
   */
  private isTaskDefinition(value: unknown): value is TaskDefinition {
    if (typeof value !== "object" || value == null || Array.isArray(value)) {
      return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
      typeof candidate.label === "string" && candidate.label.trim().length > 0
    );
  }
}
