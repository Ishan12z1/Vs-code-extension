import type {
  ExecutionPlan,
  ExplanationResponse,
} from "@control-agent/contracts";

export const DEFAULT_APPROVAL_PLACEHOLDER =
  "Plan rendering is wired. Apply and approval actions are still deferred " +
  "to later steps, so the sidebar remains read-only for now.";

export type SidebarMode = "idle" | "loading" | "showing-result";
export type SidebarScreen = "home" | "explanation" | "result";

export interface SidebarShellConfig {
  readonly backendUrl: string;
  readonly debugLogsEnabled: boolean;
}

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
   * Real backend explanation payload.
   */
  readonly plannerExplanation: ExplanationResponse | null;

  /**
   * Real backend plan payload.
   */
  readonly plannerPlan: ExecutionPlan | null;

  /**
   * Keep a generic result area for lightweight fallback text.
   */
  readonly resultTitle: string | null;
  readonly resultBody: string | null;

  readonly approvalPlaceholder: string;
  readonly logs: string[];
  readonly errorMessage: string | null;
}

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
