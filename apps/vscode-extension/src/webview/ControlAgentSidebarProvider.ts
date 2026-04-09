import * as vscode from "vscode";
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
 * B2 adds:
 * - host-owned sidebar state
 * - message handling from the webview
 * - state updates pushed back into the webview
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

  /**
   * Exposes the current view instance so commands can reveal/focus it later.
   */
  public getView(): vscode.WebviewView | undefined {
    return this.view;
  }

  /**
   * Returns the latest host-side state.
   */
  public getState(): SidebarHostState {
    return this.state;
  }

  /**
   * Generic state updater.
   *
   * This keeps future sidebar flows simple:
   * change state once here, then broadcast it to the webview.
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

  /**
   * Convenience helper for future slices.
   */
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
   * Called by VS Code when the sidebar view is created or restored.
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    // Mark the view as mounted before rendering the initial HTML.
    this.state = {
      ...this.state,
      viewMounted: true,
      statusMessage: "Sidebar view mounted. Waiting for webview ready signal.",
      lastEvent: "sidebar view resolved",
    };

    webviewView.webview.html = renderSidebarShellHtml({
      title: "Control Agent",
      subtitle:
        "VS Code-native assistant shell. This sidebar now supports host↔webview messaging.",
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

  /**
   * Tries to reveal the sidebar if a view instance already exists.
   */
  public reveal(preserveFocus = false): void {
    this.view?.show?.(preserveFocus);
  }

  /**
   * Handles webview-originated messages.
   */
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
    }
  }

  /**
   * Posts one message into the live webview if it exists.
   */
  private async postMessage(
    message: SidebarHostToWebviewMessage
  ): Promise<void> {
    if (!this.view) {
      return;
    }

    await this.view.webview.postMessage(message);
  }
}
