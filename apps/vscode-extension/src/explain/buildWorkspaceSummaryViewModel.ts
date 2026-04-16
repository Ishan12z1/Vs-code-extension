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
 *
 * E2 change:
 * - keep availability as the top-level signal
 * - surface note text directly in the summary
 * - only show keybinding when a future slice can resolve it
 *
 * We stay honest here:
 * - keybinding is usually unresolved in this slice
 * - the summary should say that clearly instead of pretending it knows more
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
      extensionsSection,
      commandsSection,
      notesSection,
    ],
  };
}
