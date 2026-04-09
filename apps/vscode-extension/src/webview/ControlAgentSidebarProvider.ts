import * as vscode from "vscode";
import { buildWorkspaceSummaryViewModel } from "../explain/buildWorkspaceSummaryViewModel";
import { createDefaultInspectors } from "../inspectors/createDefaultInspectors";
import { WorkspaceSnapshotBuilder } from "../inspectors/WorkspaceSnapshotBuilder";
import type { ExtensionRuntime } from "../state/runtime";
import {
  createInitialSidebarHostState,
  type SidebarHostState,
} from "../state/sidebarState";
import type {
  SidebarHostToWebviewMessage,
  SidebarWebviewToHostMessage,
} from "./sidebarProtocol";
import { renderSidebarShellHtml } from "./renderSidebarShellHtml";

/**
 * Real sidebar provider for the extension shell.
 *
 * B4 adds:
 * - prompt submission handling
 * - activity updates
 * - generic result rendering
 * - approval/log placeholders in host state
 */
export class ControlAgentSidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private state: SidebarHostState;

  public constructor(private readonly runtime: ExtensionRuntime) {
    const config = vscode.workspace.getConfiguration("controlAgent");

    this.state = createInitialSidebarHostState(
      config.get<boolean>("enableDebugLogs", false)
    );
  }

  public getView(): vscode.WebviewView | undefined {
    return this.view;
  }

  public getState(): SidebarHostState {
    return this.state;
  }

  /**
   * Central state updater.
   *
   * We keep state updates in one place so B4 stays predictable.
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
   * Small helper for explain-like prompt detection.
   *
   * B4 does not implement the full planner.
   * It only decides whether to reuse the existing explain flow.
   */
  private isExplainPrompt(prompt: string): boolean {
    const normalized = prompt.toLowerCase();

    return (
      normalized.includes("explain") ||
      normalized.includes("current vscode setup") ||
      normalized.includes("current setup") ||
      normalized.includes("inspect")
    );
  }

  /**
   * B3 flow, kept as the main read-only explanation path.
   */
  public async runExplainWorkspace(
    trigger = "explain workspace action"
  ): Promise<void> {
    this.runtime.output.appendLine("[sidebar] explain workspace flow started");

    await this.updateState({
      mode: "loading",
      screen: "home",
      statusMessage: "Collecting workspace state...",
      lastEvent: trigger,
      errorMessage: null,
      resultTitle: null,
      resultBody: null,
      activityItems: this.buildNextActivityItems(
        "Collecting workspace state..."
      ),
      logs: this.buildNextLogs(`[sidebar] ${trigger}`),
    });

    try {
      const builder = new WorkspaceSnapshotBuilder(
        this.runtime,
        createDefaultInspectors()
      );

      const snapshot = await builder.build();
      const explanation = buildWorkspaceSummaryViewModel(snapshot);

      await this.updateState({
        mode: "showing-result",
        screen: "explanation",
        explanation,
        statusMessage: "Workspace explanation ready.",
        lastEvent: "explain workspace completed",
        errorMessage: null,
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
        explanation: null,
        statusMessage: "Workspace explanation failed.",
        lastEvent: "explain workspace failed",
        errorMessage: message,
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
   * B4 shell submit path.
   *
   * Current behavior:
   * - explain-like prompts reuse the existing explain flow
   * - other prompts show a placeholder result inside the sidebar
   *
   * This is intentional. Step 6 planner logic does not belong here yet.
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

    if (this.isExplainPrompt(trimmedPrompt)) {
      await this.runExplainWorkspace(`prompt submit -> ${trimmedPrompt}`);
      return;
    }

    await this.updateState({
      mode: "showing-result",
      screen: "result",
      explanation: null,
      resultTitle: "Prompt captured by sidebar shell",
      resultBody:
        `You submitted:\n\n"${trimmedPrompt}"\n\n` +
        "The full planner flow is not wired yet. " +
        "At this stage, the shell can capture prompts and route explain-style requests into the existing read-only explanation flow.",
      statusMessage: "Prompt captured. Planner flow not wired yet.",
      lastEvent: "generic prompt placeholder result",
      errorMessage: null,
      activityItems: this.buildNextActivityItems(
        "Rendered placeholder result for submitted prompt."
      ),
      logs: this.buildNextLogs(
        "[sidebar] rendered placeholder result for non-explain prompt"
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
      viewMounted: true,
      statusMessage: "Sidebar view mounted. Waiting for webview ready signal.",
      lastEvent: "sidebar view resolved",
      logs: this.buildNextLogs("[sidebar] view mounted"),
    };

    webviewView.webview.html = renderSidebarShellHtml({
      title: "Control Agent",
      subtitle:
        "VS Code-native assistant shell. Prompt, activity, result, approval, and logs now live here.",
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
        /**
         * Keep the host-side prompt draft in sync, but do not spam the UI
         * with a full rerender on every keypress.
         */
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
