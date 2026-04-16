import type {
  //   VscodeFileInspection,
  VscodeFilesSnapshot,
} from "@control-agent/contracts";

/**
 * Narrow helper: only accept plain objects for task/debug JSON inspection.
 *
 * Why this exists:
 * - parsedContent is typed as unknown
 * - we want to inspect it safely without pretending we know the exact JSON shape
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

/**
 * Reads one array field from a parsed JSON object.
 *
 * Returns null when the field is missing or not an array.
 */
function getArrayField(
  record: Record<string, unknown> | null,
  key: string
): unknown[] | null {
  if (!record) {
    return null;
  }

  const value = record[key];

  return Array.isArray(value) ? value : null;
}

/**
 * Builds task/debug-oriented notes from parsed tasks.json and launch.json content.
 *
 * Why this exists:
 * - the raw file inspection already tells us present / parsed / invalid
 * - Step E3 needs more targeted task/debug signals on top of that
 * - we keep this derived and read-only; nothing here mutates or "fixes" files
 */
export function buildTaskAndDebugNotes(
  vscodeFiles: VscodeFilesSnapshot
): string[] {
  const notes: string[] = [];

  const tasksInspection = vscodeFiles.tasksJson;
  const launchInspection = vscodeFiles.launchJson;

  // tasks.json notes
  if (tasksInspection.parseStatus === "parsed") {
    const tasksRecord = asRecord(tasksInspection.parsedContent);
    const tasks = getArrayField(tasksRecord, "tasks");
    const inputs = getArrayField(tasksRecord, "inputs");

    if (tasks && tasks.length > 0) {
      notes.push(
        `Detected ${tasks.length} task definition(s) in .vscode/tasks.json.`
      );
    } else {
      notes.push(
        ".vscode/tasks.json is present but no task definitions were detected."
      );
    }

    if (inputs && inputs.length > 0) {
      notes.push(
        `Detected ${inputs.length} task input definition(s) in .vscode/tasks.json.`
      );
    }
  } else if (tasksInspection.parseStatus === "not_found") {
    notes.push(
      "No .vscode/tasks.json file was detected in the current workspace context."
    );
  }

  // launch.json notes
  if (launchInspection.parseStatus === "parsed") {
    const launchRecord = asRecord(launchInspection.parsedContent);
    const configurations = getArrayField(launchRecord, "configurations");
    const compounds = getArrayField(launchRecord, "compounds");

    if (configurations && configurations.length > 0) {
      notes.push(
        `Detected ${configurations.length} debug configuration(s) in .vscode/launch.json.`
      );
    } else {
      notes.push(
        ".vscode/launch.json is present but no debug configurations were detected."
      );
    }

    if (compounds && compounds.length > 0) {
      notes.push(
        `Detected ${compounds.length} launch compound definition(s) in .vscode/launch.json.`
      );
    }
  } else if (launchInspection.parseStatus === "not_found") {
    notes.push(
      "No .vscode/launch.json file was detected in the current workspace context."
    );
  }

  return notes;
}
