import type {
  KeybindingSignal,
  VscodeFileInspection,
  WorkspaceSnapshot,
} from "@control-agent/contracts";
import type {
  SummaryListItem,
  SummarySection,
  WorkspaceSummaryViewModel,
} from "./workspaceSummaryTypes";

/**
 * Converts booleans into user-facing labels.
 */
function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

/**
 * Joins string arrays into readable UI text.
 */
function joinOrFallback(values: string[], fallback = "None detected"): string {
  return values.length > 0 ? values.join(", ") : fallback;
}

/**
 * Narrow helper: accept only plain objects for parsed JSON content.
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

/**
 * Narrow helper: get one array field from a parsed JSON object.
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
 * Formats a settings record into summary rows.
 */
function buildSettingsItems(
  titlePrefix: string,
  settings: Record<string, unknown>
): SummaryListItem[] {
  return Object.entries(settings)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      label: `${titlePrefix}${key}`,
      value:
        typeof value === "string"
          ? value
          : (JSON.stringify(value, null, 0) ?? "null"),
      tone: "neutral",
    }));
}

/**
 * Formats one .vscode/* file inspection for the summary.
 */
function formatVscodeFileInspection(
  file: VscodeFileInspection
): SummaryListItem {
  if (!file.exists) {
    return {
      label: file.relativePath,
      value: "Not found",
      tone: "muted",
    };
  }

  if (file.parseStatus === "invalid_jsonc") {
    return {
      label: file.relativePath,
      value: `Invalid JSONC (${file.parseError ?? "unknown parse error"})`,
      tone: "warning",
    };
  }

  return {
    label: file.relativePath,
    value: "Present and parsed",
    tone: "good",
  };
}

/**
 * Formats command/keybinding-related inspection rows.
 */
function buildCommandItems(signals: KeybindingSignal[]): SummaryListItem[] {
  return signals.map((signal) => {
    const baseValue = signal.available
      ? signal.keybinding
        ? `Available • keybinding: ${signal.keybinding}`
        : "Available • keybinding unresolved"
      : "Unavailable";

    const value = signal.note ? `${baseValue} — ${signal.note}` : baseValue;

    return {
      label: signal.command,
      value,
      tone: signal.available ? "good" : "warning",
    };
  });
}

/**
 * Builds focused task/debug summary items from parsed tasks.json and launch.json.
 *
 * E3 purpose:
 * - surface task/debug-specific signals directly in the explanation UI
 * - keep this derived from parsedContent instead of introducing new contract
 *   fields too early
 */
function buildTaskAndDebugItems(
  snapshot: WorkspaceSnapshot
): SummaryListItem[] {
  const items: SummaryListItem[] = [];

  const tasksFile = snapshot.vscodeFiles.tasksJson;
  const launchFile = snapshot.vscodeFiles.launchJson;

  if (!tasksFile.exists) {
    items.push({
      label: "tasks.json",
      value: "Not found",
      tone: "muted",
    });
  } else if (tasksFile.parseStatus === "invalid_jsonc") {
    items.push({
      label: "tasks.json",
      value: `Invalid JSONC (${tasksFile.parseError ?? "unknown parse error"})`,
      tone: "warning",
    });
  } else {
    const tasksRecord = asRecord(tasksFile.parsedContent);
    const tasks = getArrayField(tasksRecord, "tasks");
    const inputs = getArrayField(tasksRecord, "inputs");

    items.push({
      label: "tasks.json",
      value:
        tasks && tasks.length > 0
          ? `${tasks.length} task definition(s) detected${inputs && inputs.length > 0 ? ` • ${inputs.length} input definition(s)` : ""}`
          : "Present, but no task definitions detected",
      tone: tasks && tasks.length > 0 ? "good" : "warning",
    });
  }

  if (!launchFile.exists) {
    items.push({
      label: "launch.json",
      value: "Not found",
      tone: "muted",
    });
  } else if (launchFile.parseStatus === "invalid_jsonc") {
    items.push({
      label: "launch.json",
      value: `Invalid JSONC (${launchFile.parseError ?? "unknown parse error"})`,
      tone: "warning",
    });
  } else {
    const launchRecord = asRecord(launchFile.parsedContent);
    const configurations = getArrayField(launchRecord, "configurations");
    const compounds = getArrayField(launchRecord, "compounds");

    items.push({
      label: "launch.json",
      value:
        configurations && configurations.length > 0
          ? `${configurations.length} debug configuration(s) detected${compounds && compounds.length > 0 ? ` • ${compounds.length} compound(s)` : ""}`
          : "Present, but no debug configurations detected",
      tone: configurations && configurations.length > 0 ? "good" : "warning",
    });
  }

  return items;
}

/**
 * Creates a compact human-readable subtitle from the highest-value signals.
 */
function buildSubtitle(snapshot: WorkspaceSnapshot): string {
  const stackSignals = snapshot.detectedMarkers.filter((marker) =>
    marker.startsWith("stack:")
  );
  const toolSignals = snapshot.detectedMarkers.filter((marker) =>
    marker.startsWith("tool:")
  );

  const parts: string[] = [];

  parts.push(
    snapshot.workspaceFolders.length > 0
      ? `${snapshot.workspaceFolders.length} workspace folder(s)`
      : "No workspace folder open"
  );

  if (stackSignals.length > 0) {
    parts.push(`Stacks: ${stackSignals.join(", ")}`);
  }

  if (toolSignals.length > 0) {
    parts.push(`Tools: ${toolSignals.join(", ")}`);
  }

  if (snapshot.vscodeFolderPresent) {
    parts.push(".vscode detected");
  }

  return parts.join(" • ");
}

/**
 * Converts the raw snapshot into a summary model used by the UI.
 */
export function buildWorkspaceSummaryViewModel(
  snapshot: WorkspaceSnapshot
): WorkspaceSummaryViewModel {
  const overviewSection: SummarySection = {
    title: "Overview",
    items: [
      {
        label: "Workspace folders",
        value:
          snapshot.workspaceFolders.length > 0
            ? snapshot.workspaceFolders.map((folder) => folder.name).join(", ")
            : "None",
      },
      {
        label: "Workspace file open",
        value: yesNo(snapshot.hasWorkspaceFile),
      },
      {
        label: ".vscode folder detected",
        value: yesNo(snapshot.vscodeFolderPresent),
      },
      {
        label: "Detected markers",
        value: joinOrFallback(snapshot.detectedMarkers),
      },
      {
        label: "Relevant files",
        value: joinOrFallback(snapshot.relevantFiles),
      },
    ],
  };

  const userSettingsSection: SummarySection = {
    title: "Relevant user settings",
    items: buildSettingsItems("", snapshot.relevantUserSettings),
    emptyMessage: "No relevant user-scope settings were detected.",
  };

  const workspaceSettingsSection: SummarySection = {
    title: "Relevant workspace settings",
    items: buildSettingsItems("", snapshot.relevantWorkspaceSettings),
    emptyMessage: "No relevant workspace-scope settings were detected.",
  };

  const vscodeFilesSection: SummarySection = {
    title: ".vscode files",
    items: [
      formatVscodeFileInspection(snapshot.vscodeFiles.settingsJson),
      formatVscodeFileInspection(snapshot.vscodeFiles.tasksJson),
      formatVscodeFileInspection(snapshot.vscodeFiles.launchJson),
      formatVscodeFileInspection(snapshot.vscodeFiles.extensionsJson),
    ],
  };

  const taskAndDebugSection: SummarySection = {
    title: "Tasks and debug",
    items: buildTaskAndDebugItems(snapshot),
    emptyMessage: "No task/debug signals were collected.",
  };

  const extensionsSection: SummarySection = {
    title: "Selected extension state",
    items: snapshot.installedTargetExtensions.map((extension) => ({
      label: extension.id,
      value: extension.installed
        ? `Installed${extension.version ? ` (v${extension.version})` : ""}${extension.isActive ? " • active" : ""}`
        : "Not installed",
      tone: extension.installed ? "good" : "warning",
    })),
    emptyMessage: "No target extension state was collected.",
  };

  const commandsSection: SummarySection = {
    title: "Relevant command availability",
    items: buildCommandItems(snapshot.keybindingSignals),
    emptyMessage: "No command availability signals were collected.",
  };

  const notesSection: SummarySection = {
    title: "Notes",
    items: snapshot.notes.map((note) => ({
      label: "Note",
      value: note,
      tone: note.toLowerCase().includes("invalid") ? "warning" : "neutral",
    })),
    emptyMessage: "No additional notes.",
  };

  return {
    title: "Current VS Code setup",
    subtitle: buildSubtitle(snapshot),
    sections: [
      overviewSection,
      userSettingsSection,
      workspaceSettingsSection,
      vscodeFilesSection,
      taskAndDebugSection,
      extensionsSection,
      commandsSection,
      notesSection,
    ],
  };
}
