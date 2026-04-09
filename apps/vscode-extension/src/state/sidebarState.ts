import type { WorkspaceSummaryViewModel } from "../explain/workspaceSummaryTypes";

/**
 * Sidebar mode for the shell.
 */
export type SidebarMode = "idle" | "loading" | "showing-result";

/**
 * Which main screen is active.
 *
 * - home: default shell
 * - explanation: read-only workspace explanation
 * - result: generic placeholder result for submitted prompts
 */
export type SidebarScreen = "home" | "explanation" | "result";

/**
 * Extension-host-owned sidebar state.
 *
 * This stays the source of truth for the sidebar.
 * The webview only renders what the host sends.
 */
export interface SidebarHostState {
  readonly mode: SidebarMode;
  readonly screen: SidebarScreen;
  readonly ready: boolean;
  readonly viewMounted: boolean;
  readonly statusMessage: string;
  readonly lastEvent: string | null;
  readonly debugLogsEnabled: boolean;

  /**
   * Prompt draft held by the shell.
   * B4 uses this to make the sidebar feel like a real assistant surface.
   */
  readonly promptDraft: string;

  /**
   * Lightweight activity feed shown in the sidebar.
   * Keep this simple for now.
   */
  readonly activityItems: string[];

  /**
   * Read-only explanation result reused from B3.
   */
  readonly explanation: WorkspaceSummaryViewModel | null;

  /**
   * Generic result area for non-explain prompts.
   * This is still placeholder-only in B4.
   */
  readonly resultTitle: string | null;
  readonly resultBody: string | null;

  /**
   * Approval flow is not implemented yet, but the shell needs a visible placeholder.
   */
  readonly approvalPlaceholder: string;

  /**
   * Lightweight shell logs.
   */
  readonly logs: string[];

  /**
   * Error state for user-visible failures.
   */
  readonly errorMessage: string | null;
}

/**
 * Default state used before the sidebar view is mounted.
 */
export function createInitialSidebarHostState(
  debugLogsEnabled: boolean
): SidebarHostState {
  return {
    mode: "idle",
    screen: "home",
    ready: false,
    viewMounted: false,
    statusMessage: "Sidebar shell created. Waiting for webview handshake.",
    lastEvent: null,
    debugLogsEnabled,
    promptDraft: "",
    activityItems: ["Sidebar shell initialized."],
    explanation: null,
    resultTitle: null,
    resultBody: null,
    approvalPlaceholder:
      "Approval flow is not wired yet. Risk review and apply controls will appear here later.",
    logs: ["Sidebar shell initialized."],
    errorMessage: null,
  };
}
