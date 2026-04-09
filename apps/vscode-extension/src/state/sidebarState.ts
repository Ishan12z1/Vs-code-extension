import type { WorkspaceSummaryViewModel } from "../explain/workspaceSummaryTypes";

export const DEFAULT_APPROVAL_PLACEHOLDER =
  "Preview, apply, and approval controls are intentionally not wired yet. " +
  "This shell currently captures requests and renders read-only explanations.";

/**
 * Sidebar mode for the shell.
 */
export type SidebarMode = "idle" | "loading" | "showing-result";

/**
 * Which main screen is active.
 */
export type SidebarScreen = "home" | "explanation" | "result";

/**
 * Sidebar-visible extension configuration.
 *
 * B5 uses this to make the shell reflect actual extension settings.
 */
export interface SidebarShellConfig {
  readonly backendUrl: string;
  readonly debugLogsEnabled: boolean;
}

/**
 * Extension-host-owned sidebar state.
 *
 * The webview only renders what the host sends.
 */
export interface SidebarHostState {
  readonly mode: SidebarMode;
  readonly screen: SidebarScreen;
  readonly ready: boolean;
  readonly viewMounted: boolean;
  readonly statusMessage: string;
  readonly lastEvent: string | null;

  /**
   * Current visible shell configuration.
   */
  readonly config: SidebarShellConfig;

  /**
   * Prompt draft held by the shell.
   */
  readonly promptDraft: string;

  /**
   * Lightweight activity feed shown in the sidebar.
   */
  readonly activityItems: string[];

  /**
   * Read-only explanation result reused from earlier slices.
   */
  readonly explanation: WorkspaceSummaryViewModel | null;

  /**
   * Generic result area for non-explain prompts.
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
  config: SidebarShellConfig
): SidebarHostState {
  return {
    mode: "idle",
    screen: "home",
    ready: false,
    viewMounted: false,
    statusMessage: "Sidebar shell created. Waiting for webview handshake.",
    lastEvent: null,
    config,
    promptDraft: "",
    activityItems: ["Sidebar shell initialized."],
    explanation: null,
    resultTitle: null,
    resultBody: null,
    approvalPlaceholder: DEFAULT_APPROVAL_PLACEHOLDER,
    logs: ["Sidebar shell initialized."],
    errorMessage: null,
  };
}
