import type { WorkspaceSummaryViewModel } from "../explain/workspaceSummaryTypes";

/**
 * Sidebar mode for the shell.
 *
 * - idle: nothing active yet
 * - loading: host is building a result
 * - showing-result: sidebar has something useful to display
 */
export type SidebarMode = "idle" | "loading" | "showing-result";

/**
 * Which screen is currently shown in the sidebar.
 *
 * B3 only needs:
 * - home
 * - explanation
 */
export type SidebarScreen = "home" | "explanation";

/**
 * Extension-host-owned sidebar state.
 *
 * This is the source of truth.
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
   * Filled when the explain flow succeeds.
   */
  readonly explanation: WorkspaceSummaryViewModel | null;

  /**
   * Filled when a sidebar action fails.
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
    explanation: null,
    errorMessage: null,
  };
}
