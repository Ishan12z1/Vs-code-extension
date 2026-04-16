import * as vscode from "vscode";
import { collectWorkspaceExplanation } from "../explain/collectWorkspaceExplanation";
import type { ExtensionRuntime } from "../state/runtime";
import {
  DEFAULT_APPROVAL_PLACEHOLDER,
  createInitialSidebarHostState,
  type SidebarHostState,
  type SidebarShellConfig,
} from "../state/sidebarState";
import type {
  SidebarHostToWebviewMessage,
  SidebarWebviewToHostMessage,
} from "./sidebarProtocol";
import {
  classifyShellPrompt,
  isExplainLikePrompt,
} from "./classifyShellPrompt";
import { renderSidebarShellHtml } from "./renderSidebarShellHtml";

/**
 * Real sidebar provider for the extension shell.
 *
 * E6 keeps the sidebar as the one real explain surface and centralizes
 * the explain pipeline through collectWorkspaceExplanation().
 */
export class ControlAgentSidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private state: SidebarHostState;

  public constructor(private readonly runtime: ExtensionRuntime) {
    this.state = createInitialSidebarHostState(this.readShellConfig());
  }

  public getView(): vscode.WebviewView | undefined {
    return this.view;
  }

  public getState(): SidebarHostState {
    return this.state;
  }

  /**
   * Reads the current extension configuration that should be visible in the shell.
   */
  private readShellConfig(): SidebarShellConfig {
    const config = vscode.workspace.getConfiguration("controlAgent");

    return {
      backendUrl: config.get<string>("backendUrl", "http://127.0.0.1:8000"),
      debugLogsEnabled: config.get<boolean>("enableDebugLogs", false),
    };
  }

  /**
   * Central state updater.
   */
  public async updateState(patch: Partial<SidebarHostState>): Promise<void> {
    this.state = {
      ...this.state,
      ...patch,
    };

    await this.postMessage({
      type: "sidebar/stateUpdated",
      payload: this.state,
    });
  }

  public async setStatus(
    statusMessage: string,
    lastEvent: string,
    mode: SidebarHostState["mode"] = "idle"
  ): Promise<void> {
    await this.updateState({
      statusMessage,
      lastEvent,
      mode,
    });
  }

  /**
   * Appends one activity item and keeps the list bounded.
   */
  private buildNextActivityItems(item: string): string[] {
    return [...this.state.activityItems, item].slice(-8);
  }

  /**
   * Appends one log line and keeps the list bounded.
   */
  private buildNextLogs(item: string): string[] {
    return [...this.state.logs, item].slice(-25);
  }

  /**
   * B5 config refresh hook.
   *
   * This is used both:
   * - from the sidebar UI refresh action
   * - from extension-side configuration change events
   */
  public async refreshShellConfiguration(
    reason = "shell configuration refreshed"
  ): Promise<void> {
    const nextConfig = this.readShellConfig();

    await this.updateState({
      config: nextConfig,
      statusMessage: "Shell configuration refreshed.",
      lastEvent: reason,
      activityItems: this.buildNextActivityItems(
        "Refreshed visible shell configuration."
      ),
      logs: this.buildNextLogs(`[sidebar] ${reason}`),
    });

    await this.postMessage({
      type: "sidebar/ack",
      payload: {
        message: `Shell configuration refreshed. Backend URL is ${nextConfig.backendUrl}.`,
      },
    });
  }

  /**
   * Final read-only explain flow.
   *
   * E6 makes this the one canonical sidebar explain path.
   * It also clears stale result/approval state before showing explanation output.
   */
  public async runExplainWorkspace(
    trigger = "explain workspace action"
  ): Promise<void> {
    this.runtime.output.appendLine("[sidebar] explain workspace flow started");

    await this.updateState({
      mode: "loading",
      screen: "home",

      // Clear stale explain/result/error state before rebuilding.
      explanation: null,
      resultTitle: null,
      resultBody: null,
      approvalPlaceholder: DEFAULT_APPROVAL_PLACEHOLDER,
      errorMessage: null,

      statusMessage: "Collecting workspace state...",
      lastEvent: trigger,
      activityItems: this.buildNextActivityItems(
        "Collecting workspace state..."
      ),
      logs: this.buildNextLogs(`[sidebar] ${trigger}`),
    });

    try {
      const { explanation } = await collectWorkspaceExplanation(this.runtime);

      await this.updateState({
        mode: "showing-result",
        screen: "explanation",

        // Explanation is now the active surface.
        explanation,
        resultTitle: null,
        resultBody: null,
        approvalPlaceholder: DEFAULT_APPROVAL_PLACEHOLDER,
        errorMessage: null,

        statusMessage: "Workspace explanation ready.",
        lastEvent: "explain workspace completed",
        activityItems: this.buildNextActivityItems(
          "Built read-only workspace explanation."
        ),
        logs: this.buildNextLogs(
          "[sidebar] workspace explanation rendered in sidebar"
        ),
      });

      await this.postMessage({
        type: "sidebar/ack",
        payload: {
          message: "Workspace explanation rendered in the sidebar.",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error while building workspace explanation.";

      await this.updateState({
        mode: "idle",
        screen: "home",

        // Keep explain-mode reset behavior consistent even on failure.
        explanation: null,
        resultTitle: null,
        resultBody: null,
        approvalPlaceholder: DEFAULT_APPROVAL_PLACEHOLDER,
        errorMessage: message,

        statusMessage: "Workspace explanation failed.",
        lastEvent: "explain workspace failed",
        activityItems: this.buildNextActivityItems(
          "Workspace explanation failed."
        ),
        logs: this.buildNextLogs(`[sidebar] explanation failed: ${message}`),
      });

      await this.postMessage({
        type: "sidebar/ack",
        payload: {
          message: `Workspace explanation failed: ${message}`,
        },
      });
    }
  }

  /**
   * Shell submit path.
   */
  public async submitPrompt(prompt: string): Promise<void> {
    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length === 0) {
      await this.updateState({
        mode: "idle",
        screen: "home",
        statusMessage: "Prompt submission blocked.",
        lastEvent: "empty prompt submission",
        errorMessage: "Enter a prompt before submitting.",
        activityItems: this.buildNextActivityItems("Rejected empty prompt."),
        logs: this.buildNextLogs("[sidebar] rejected empty prompt"),
      });
      return;
    }

    await this.updateState({
      promptDraft: trimmedPrompt,
      mode: "loading",
      statusMessage: "Processing prompt in sidebar shell...",
      lastEvent: "prompt submitted",
      errorMessage: null,
      activityItems: this.buildNextActivityItems(
        `Submitted prompt: ${trimmedPrompt}`
      ),
      logs: this.buildNextLogs(`[sidebar] prompt submitted: ${trimmedPrompt}`),
    });

    if (isExplainLikePrompt(trimmedPrompt)) {
      await this.runExplainWorkspace(`prompt submit -> ${trimmedPrompt}`);
      return;
    }

    const classification = classifyShellPrompt(trimmedPrompt);
    const approvalPlaceholder =
      classification.route === "configure" || classification.route === "repair"
        ? "This looks like a change-oriented request. Preview/apply/approval are deferred to later steps, so no local changes were made."
        : DEFAULT_APPROVAL_PLACEHOLDER;

    await this.updateState({
      mode: "showing-result",
      screen: "result",
      explanation: null,
      resultTitle: `${classification.label} request captured`,
      resultBody: [
        `Prompt: "${trimmedPrompt}"`,
        "",
        `Detected route: ${classification.label}`,
        "Shell action: captured locally in the sidebar state model",
        `Next step: ${classification.nextStep}`,
        "",
        "Planner, preview, apply, and approval are intentionally deferred to later steps.",
        "No local changes were made.",
      ].join("\n"),
      approvalPlaceholder,
      statusMessage: `${classification.label} request captured in sidebar shell.`,
      lastEvent: "request captured in shell",
      errorMessage: null,
      activityItems: this.buildNextActivityItems(
        `Captured ${classification.label.toLowerCase()} request in shell.`
      ),
      logs: this.buildNextLogs(
        `[sidebar] captured non-explain prompt (${classification.route})`
      ),
    });

    await this.postMessage({
      type: "sidebar/ack",
      payload: {
        message: "Prompt captured in sidebar shell.",
      },
    });
  }

  /**
   * Returns the sidebar to its base shell state.
   */
  public async showHome(): Promise<void> {
    await this.updateState({
      mode: "idle",
      screen: "home",
      statusMessage: "Showing sidebar home.",
      lastEvent: "show home",
      explanation: null,
      resultTitle: null,
      resultBody: null,
      approvalPlaceholder: DEFAULT_APPROVAL_PLACEHOLDER,
      errorMessage: null,
      activityItems: this.buildNextActivityItems("Returned to sidebar home."),
      logs: this.buildNextLogs("[sidebar] returned to home screen"),
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    this.state = {
      ...this.state,
      config: this.readShellConfig(),
      viewMounted: true,
      statusMessage: "Sidebar view mounted. Waiting for webview ready signal.",
      lastEvent: "sidebar view resolved",
      logs: this.buildNextLogs("[sidebar] view mounted"),
    };

    webviewView.webview.html = renderSidebarShellHtml({
      title: "Control Agent",
      subtitle:
        "VS Code-native assistant shell. Sidebar focus, visible config, and verification are now polished.",
      initialState: this.state,
    });

    webviewView.webview.onDidReceiveMessage(
      (message: SidebarWebviewToHostMessage) => {
        void this.handleWebviewMessage(message);
      },
      undefined,
      this.runtime.context.subscriptions
    );

    this.runtime.output.appendLine("[sidebar] sidebar view resolved");
  }

  public reveal(preserveFocus = false): void {
    this.view?.show?.(preserveFocus);
  }

  private async handleWebviewMessage(
    message: SidebarWebviewToHostMessage
  ): Promise<void> {
    this.runtime.output.appendLine(
      `[sidebar] received webview message: ${message.type}`
    );

    switch (message.type) {
      case "sidebar/ready": {
        await this.updateState({
          ready: true,
          statusMessage: "Webview handshake complete.",
          lastEvent: "webview ready",
          logs: this.buildNextLogs("[sidebar] webview ready"),
        });
        return;
      }

      case "sidebar/requestState": {
        await this.postMessage({
          type: "sidebar/stateUpdated",
          payload: this.state,
        });

        await this.postMessage({
          type: "sidebar/ack",
          payload: {
            message: "Extension host sent the latest sidebar state.",
          },
        });

        return;
      }

      case "sidebar/ping": {
        await this.updateState({
          statusMessage: `Received ping from webview at ${message.payload.sentAt}`,
          lastEvent: "webview ping",
          logs: this.buildNextLogs(
            `[sidebar] received ping from webview at ${message.payload.sentAt}`
          ),
        });

        await this.postMessage({
          type: "sidebar/ack",
          payload: {
            message: `Extension host received sidebar ping sent at ${message.payload.sentAt}.`,
          },
        });

        return;
      }

      case "sidebar/updatePromptDraft": {
        this.state = {
          ...this.state,
          promptDraft: message.payload.prompt,
        };
        return;
      }

      case "sidebar/submitPrompt": {
        await this.submitPrompt(message.payload.prompt);
        return;
      }

      case "sidebar/triggerExplainWorkspace": {
        await this.runExplainWorkspace("sidebar explain button");
        return;
      }

      case "sidebar/showHome": {
        await this.showHome();
        return;
      }

      case "sidebar/refreshShell": {
        await this.refreshShellConfiguration("manual shell refresh");
        return;
      }
    }
  }

  private async postMessage(
    message: SidebarHostToWebviewMessage
  ): Promise<void> {
    if (!this.view) {
      return;
    }

    await this.view.webview.postMessage(message);
  }
}
