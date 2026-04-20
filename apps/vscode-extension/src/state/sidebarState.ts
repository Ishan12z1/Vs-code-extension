import type { legacy } from "@control-agent/contracts";

/**
 * Placeholder text shown in the sidebar while real approval/apply flows
 * are still being migrated into the new local-first runtime.
 */
export const DEFAULT_APPROVAL_PLACEHOLDER =
  "Plan rendering is wired. Apply and approval actions are still deferred " +
  "to later steps, so the sidebar remains read-only for now.";

/**
 * Very small UI-state enums for the current sidebar shell.
 *
 * Current phase note:
 * - this file still belongs to the transitional sidebar/planner path
 * - later phases may replace these fields with runtime-first UI state
 */
export type SidebarMode = "idle" | "loading" | "showing-result";
export type SidebarScreen = "home" | "explanation" | "result";

/**
 * Visible shell configuration currently read by the sidebar.
 *
 * Note:
 * - backendUrl is still legacy/transitional
 * - it remains here until the old planner-backed sidebar path is fully removed
 */
export interface SidebarShellConfig {
  readonly backendUrl: string;
  readonly debugLogsEnabled: boolean;
}

/**
 * Host-side state mirrored into the webview.
 *
 * Important:
 * - plannerExplanation and plannerPlan are still old planner-era payloads
 * - so they must now come from contracts.legacy
 */
export interface SidebarHostState {
  readonly mode: SidebarMode;
  readonly screen: SidebarScreen;
  readonly ready: boolean;
  readonly viewMounted: boolean;
  readonly statusMessage: string;
  readonly lastEvent: string | null;

  readonly config: SidebarShellConfig;
  readonly promptDraft: string;
  readonly activityItems: string[];

  /**
   * Transitional planner explanation payload.
   *
   * This is intentionally still typed using the legacy contracts namespace
   * because the sidebar provider still renders the old explanation shape.
   */
  readonly plannerExplanation: legacy.ExplanationResponse | null;

  /**
   * Transitional planner plan payload.
   *
   * This is intentionally still typed using the legacy contracts namespace
   * because the sidebar provider still renders the old execution plan shape.
   */
  readonly plannerPlan: legacy.ExecutionPlan | null;

  /**
   * Generic fallback text area used when a structured payload is not rendered.
   */
  readonly resultTitle: string | null;
  readonly resultBody: string | null;

  readonly approvalPlaceholder: string;
  readonly logs: string[];
  readonly errorMessage: string | null;
}

/**
 * Create the initial host-side sidebar state.
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
    plannerExplanation: null,
    plannerPlan: null,
    resultTitle: null,
    resultBody: null,
    approvalPlaceholder: DEFAULT_APPROVAL_PLACEHOLDER,
    logs: ["Sidebar shell initialized."],
    errorMessage: null,
  };
}
