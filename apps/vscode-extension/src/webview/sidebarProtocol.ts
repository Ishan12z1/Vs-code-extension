import type { SidebarHostState } from "../state/sidebarState";

/**
 * Messages the webview can send to the extension host.
 */
export type SidebarWebviewToHostMessage =
  | {
      type: "sidebar/ready";
    }
  | {
      type: "sidebar/requestState";
    }
  | {
      type: "sidebar/ping";
      payload: {
        sentAt: string;
      };
    }
  | {
      type: "sidebar/updatePromptDraft";
      payload: {
        prompt: string;
      };
    }
  | {
      type: "sidebar/submitPrompt";
      payload: {
        prompt: string;
      };
    }
  | {
      type: "sidebar/triggerExplainWorkspace";
    }
  | {
      type: "sidebar/showHome";
    }
  | {
      type: "sidebar/refreshShell";
    };

/**
 * Messages the extension host can send to the webview.
 */
export type SidebarHostToWebviewMessage =
  | {
      type: "sidebar/stateUpdated";
      payload: SidebarHostState;
    }
  | {
      type: "sidebar/ack";
      payload: {
        message: string;
      };
    };
