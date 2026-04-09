import * as vscode from "vscode";
import { buildWorkspaceSummaryViewModel } from "../explain/buildWorkspaceSummaryViewModel";
import { createDefaultInspectors } from "../inspectors/createDefaultInspectors";
import type { ExtensionRuntime } from "../state/runtime";
import {
  createInitialSidebarHostState,
  type SidebarHostState,
} from "../state/sidebarState";
import { WorkspaceSnapshotBuilder } from "../inspectors/WorkspaceSnapshotBuilder";
import type {
  SidebarHostToWebviewMessage,
  SidebarWebviewToHostMessage,
} from "./sidebarProtocol";
import { renderSidebarShellHtml } from "./renderSidebarShellHtml";

/**
 * Real sidebar provider for the extension shell.
 *
 * B3 adds:
 * - explain flow execution inside the sidebar
 * - sidebar screen switching
 * - explanation state hosted in the extension layer
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
   * B3 main action:
   * builds the existing workspace explanation and stores it in sidebar state.
   */
  public async runExplainWorkspace(): Promise<void> {
    this.runtime.output.appendLine("[sidebar] explain workspace flow started");

    await this.updateState({
      mode: "loading",
      screen: "home",
      statusMessage: "Collecting workspace state...",
      lastEvent: "explain workspace started",
      errorMessage: null,
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
   * Returns the sidebar to its basic home screen.
   */
  public async showHome(): Promise<void> {
    await this.updateState({
      mode: "idle",
      screen: "home",
      statusMessage: "Showing sidebar home.",
      lastEvent: "show home",
      explanation: null,
      errorMessage: null,
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
    };

    webviewView.webview.html = renderSidebarShellHtml({
      title: "Control Agent",
      subtitle:
        "VS Code-native assistant shell. The read-only explain flow now lives in this sidebar.",
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
        });

        await this.postMessage({
          type: "sidebar/ack",
          payload: {
            message: `Extension host received sidebar ping sent at ${message.payload.sentAt}.`,
          },
        });

        return;
      }

      case "sidebar/triggerExplainWorkspace": {
        await this.runExplainWorkspace();
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
