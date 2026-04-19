import * as vscode from "vscode";
import type { RequestClass } from "@control-agent/contracts";
import { requestPlannerResponse } from "../planner/requestPlannerResponse";
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
import { classifyShellPrompt } from "./classifyShellPrompt";
import { renderSidebarShellHtml } from "./renderSidebarShellHtml";

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

  private readShellConfig(): SidebarShellConfig {
    const config = vscode.workspace.getConfiguration("controlAgent");

    return {
      backendUrl: config.get<string>("backendUrl", "http://127.0.0.1:8000"),
      debugLogsEnabled: config.get<boolean>("enableDebugLogs", false),
    };
  }

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

  private buildNextActivityItems(item: string): string[] {
    return [...this.state.activityItems, item].slice(-8);
  }

  private buildNextLogs(item: string): string[] {
    return [...this.state.logs, item].slice(-25);
  }

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

  public async runExplainWorkspace(
    trigger = "explain workspace action"
  ): Promise<void> {
    await this.runPlannerPrompt(
      "Explain my current VS Code setup",
      trigger,
      "explain"
    );
  }

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

    const classification = classifyShellPrompt(trimmedPrompt);
    const requestClassHint = this.toRequestClassHint(classification.route);

    await this.runPlannerPrompt(
      trimmedPrompt,
      "prompt submitted",
      requestClassHint
    );
  }

  private toRequestClassHint(
    route: ReturnType<typeof classifyShellPrompt>["route"]
  ): RequestClass | undefined {
    switch (route) {
      case "explain":
        return "explain";
      case "configure":
        return "configure";
      case "repair":
        return "repair";
      case "guide":
        return "guide";
      default:
        return undefined;
    }
  }

  private async runPlannerPrompt(
    prompt: string,
    trigger: string,
    requestClassHint?: RequestClass
  ): Promise<void> {
    this.runtime.output.appendLine(`[sidebar] planner flow started: ${prompt}`);

    await this.updateState({
      mode: "loading",
      screen: "home",
      promptDraft: prompt,
      plannerExplanation: null,
      plannerPlan: null,
      resultTitle: null,
      resultBody: null,
      approvalPlaceholder: DEFAULT_APPROVAL_PLACEHOLDER,
      errorMessage: null,
      statusMessage: "Collecting workspace state and calling planner...",
      lastEvent: trigger,
      activityItems: this.buildNextActivityItems(
        `Submitting planner request: ${prompt}`
      ),
      logs: this.buildNextLogs(
        `[sidebar] planner request submitted: ${prompt}`
      ),
    });

    try {
      const response = await requestPlannerResponse({
        runtime: this.runtime,
        backendUrl: this.state.config.backendUrl,
        prompt,
        requestClassHint,
      });

      if (response.kind === "plan") {
        await this.updateState({
          mode: "showing-result",
          screen: "result",
          plannerExplanation: null,
          plannerPlan: response.data,
          resultTitle: null,
          resultBody: null,
          approvalPlaceholder: response.data.approval.required
            ? `Approval required: ${response.data.approval.reason}`
            : `No approval required: ${response.data.approval.reason}`,
          errorMessage: null,
          statusMessage: "Planner returned a structured plan.",
          lastEvent: "plan rendered",
          activityItems: this.buildNextActivityItems(
            `Rendered plan with ${response.data.actions.length} action(s).`
          ),
          logs: this.buildNextLogs("[sidebar] structured plan rendered"),
        });

        await this.postMessage({
          type: "sidebar/ack",
          payload: {
            message: "Structured plan rendered in the sidebar.",
          },
        });

        return;
      }

      if (response.kind === "explanation") {
        await this.updateState({
          mode: "showing-result",
          screen: "explanation",
          plannerExplanation: response.data,
          plannerPlan: null,
          resultTitle: null,
          resultBody: null,
          approvalPlaceholder: DEFAULT_APPROVAL_PLACEHOLDER,
          errorMessage: null,
          statusMessage: "Planner returned an explanation.",
          lastEvent: "explanation rendered",
          activityItems: this.buildNextActivityItems(
            "Rendered planner explanation."
          ),
          logs: this.buildNextLogs("[sidebar] structured explanation rendered"),
        });

        await this.postMessage({
          type: "sidebar/ack",
          payload: {
            message: "Structured explanation rendered in the sidebar.",
          },
        });

        return;
      }

      await this.updateState({
        mode: "idle",
        screen: "home",
        plannerExplanation: null,
        plannerPlan: null,
        resultTitle: "Planner returned an error",
        resultBody: response.error.message,
        approvalPlaceholder: DEFAULT_APPROVAL_PLACEHOLDER,
        errorMessage: response.error.message,
        statusMessage: "Planner request failed.",
        lastEvent: "planner error",
        activityItems: this.buildNextActivityItems(
          "Planner returned an error."
        ),
        logs: this.buildNextLogs(
          `[sidebar] planner error: ${response.error.code}`
        ),
      });

      await this.postMessage({
        type: "sidebar/ack",
        payload: {
          message: `Planner error: ${response.error.message}`,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown planner error while contacting the backend.";

      await this.updateState({
        mode: "idle",
        screen: "home",
        plannerExplanation: null,
        plannerPlan: null,
        resultTitle: null,
        resultBody: null,
        approvalPlaceholder: DEFAULT_APPROVAL_PLACEHOLDER,
        errorMessage: message,
        statusMessage: "Planner request failed.",
        lastEvent: "planner request failed",
        activityItems: this.buildNextActivityItems("Planner request failed."),
        logs: this.buildNextLogs(
          `[sidebar] planner request failed: ${message}`
        ),
      });

      await this.postMessage({
        type: "sidebar/ack",
        payload: {
          message: `Planner request failed: ${message}`,
        },
      });
    }
  }

  public async showHome(): Promise<void> {
    await this.updateState({
      mode: "idle",
      screen: "home",
      statusMessage: "Showing sidebar home.",
      lastEvent: "show home",
      plannerExplanation: null,
      plannerPlan: null,
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
      subtitle: "Real planner result rendering is now wired into the sidebar.",
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
