/**
 * Sidebar mode for the shell.
 *
 * Keep this intentionally small in B2.
 * Later slices can add richer modes without changing the messaging pattern.
 */
export type SidebarMode = "idle" | "loading" | "showing-result";

/**
 * Extension-host-owned sidebar state.
 *
 * This is the source of truth for the sidebar shell in B2.
 * The webview receives this state and renders it.
 */
export interface SidebarHostState {
  readonly mode: SidebarMode;
  readonly ready: boolean;
  readonly viewMounted: boolean;
  readonly statusMessage: string;
  readonly lastEvent: string | null;
  readonly debugLogsEnabled: boolean;
}

/**
 * Default state used before the sidebar view is mounted.
 */
export function createInitialSidebarHostState(
  debugLogsEnabled: boolean
): SidebarHostState {
  return {
    mode: "idle",
    ready: false,
    viewMounted: false,
    statusMessage: "Sidebar shell created. Waiting for webview handshake.",
    lastEvent: null,
    debugLogsEnabled,
  };
}
