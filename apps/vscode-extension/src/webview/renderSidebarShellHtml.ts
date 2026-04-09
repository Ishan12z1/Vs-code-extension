import type { SidebarHostState } from "../state/sidebarState";

/**
 * Escapes user-controlled text before inserting it into HTML.
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Safely serializes state into an inline <script>.
 *
 * Replacing "<" avoids accidentally closing the script tag if future state
 * ever contains HTML-like content.
 */
function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

/**
 * Renders the B2 sidebar shell.
 *
 * New in B2:
 * - the webview can talk to the extension host
 * - the host can push state updates back into the webview
 * - the shell renders live state instead of only static text
 */
export function renderSidebarShellHtml(options: {
  title: string;
  subtitle: string;
  initialState: SidebarHostState;
}): string {
  const initialStateJson = serializeForInlineScript(options.initialState);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(options.title)}</title>
    <style>
      :root {
        color-scheme: light dark;
      }

      body {
        margin: 0;
        padding: 16px;
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
      }

      .shell {
        display: grid;
        gap: 12px;
      }

      .hero,
      .card {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 10px;
        padding: 14px;
        background: var(--vscode-editor-background);
      }

      .hero h1,
      .card h2 {
        margin: 0 0 8px;
      }

      .hero h1 {
        font-size: 18px;
      }

      .hero p,
      .card p,
      .card li {
        margin: 0;
        color: var(--vscode-descriptionForeground);
        line-height: 1.4;
      }

      .status-grid {
        display: grid;
        gap: 10px;
      }

      .status-row {
        border-top: 1px solid var(--vscode-panel-border);
        padding-top: 10px;
      }

      .status-row:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .status-label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 4px;
      }

      .status-value {
        font-weight: 600;
      }

      .good {
        color: var(--vscode-testing-iconPassed);
      }

      .warning {
        color: var(--vscode-editorWarning-foreground);
      }

      .muted {
        color: var(--vscode-descriptionForeground);
      }

      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      button {
        border: 1px solid var(--vscode-button-border, transparent);
        border-radius: 6px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        padding: 8px 10px;
        cursor: pointer;
      }

      button:hover {
        background: var(--vscode-button-hoverBackground);
      }

      .log {
        white-space: pre-wrap;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="hero">
        <h1>${escapeHtml(options.title)}</h1>
        <p>${escapeHtml(options.subtitle)}</p>
      </section>

      <section class="card">
        <h2>Shell status</h2>
        <div class="status-grid">
          <div class="status-row">
            <div class="status-label">Mode</div>
            <div class="status-value" id="modeValue">idle</div>
          </div>

          <div class="status-row">
            <div class="status-label">Webview ready</div>
            <div class="status-value" id="readyValue">No</div>
          </div>

          <div class="status-row">
            <div class="status-label">View mounted</div>
            <div class="status-value" id="mountedValue">No</div>
          </div>

          <div class="status-row">
            <div class="status-label">Status message</div>
            <div class="status-value" id="statusMessageValue">Waiting...</div>
          </div>

          <div class="status-row">
            <div class="status-label">Last event</div>
            <div class="status-value muted" id="lastEventValue">None</div>
          </div>

          <div class="status-row">
            <div class="status-label">Debug logs enabled</div>
            <div class="status-value" id="debugLogsValue">No</div>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Bridge controls</h2>
        <p style="margin-bottom: 10px;">
          These controls exist only to prove that the extension host and the sidebar can talk to each other.
        </p>
        <div class="controls">
          <button id="requestStateButton" type="button">Request current state</button>
          <button id="pingHostButton" type="button">Send ping to host</button>
        </div>
      </section>

      <section class="card">
        <h2>Bridge log</h2>
        <p class="log muted" id="logValue">No messages yet.</p>
      </section>
    </div>

    <script>
      const vscode = acquireVsCodeApi();

      /**
       * B2 source of truth inside the webview.
       * It starts from server-rendered state and is updated by host messages.
       */
      let currentState = ${initialStateJson};

      const modeValue = document.getElementById("modeValue");
      const readyValue = document.getElementById("readyValue");
      const mountedValue = document.getElementById("mountedValue");
      const statusMessageValue = document.getElementById("statusMessageValue");
      const lastEventValue = document.getElementById("lastEventValue");
      const debugLogsValue = document.getElementById("debugLogsValue");
      const logValue = document.getElementById("logValue");
      const requestStateButton = document.getElementById("requestStateButton");
      const pingHostButton = document.getElementById("pingHostButton");

      /**
       * Small local renderer for host-provided state.
       */
      function renderState(state) {
        currentState = state;

        modeValue.textContent = state.mode;
        readyValue.textContent = state.ready ? "Yes" : "No";
        mountedValue.textContent = state.viewMounted ? "Yes" : "No";
        statusMessageValue.textContent = state.statusMessage;
        lastEventValue.textContent = state.lastEvent ?? "None";
        debugLogsValue.textContent = state.debugLogsEnabled ? "Yes" : "No";

        readyValue.className = "status-value " + (state.ready ? "good" : "warning");
        mountedValue.className = "status-value " + (state.viewMounted ? "good" : "warning");
      }

      /**
       * Simple text log inside the sidebar.
       */
      function setLog(message) {
        logValue.textContent = message;
      }

      requestStateButton.addEventListener("click", () => {
        vscode.postMessage({
          type: "sidebar/requestState"
        });
      });

      pingHostButton.addEventListener("click", () => {
        vscode.postMessage({
          type: "sidebar/ping",
          payload: {
            sentAt: new Date().toISOString()
          }
        });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;

        if (!message || typeof message.type !== "string") {
          return;
        }

        if (message.type === "sidebar/stateUpdated") {
          renderState(message.payload);
          setLog("Received sidebar state update from extension host.");
          return;
        }

        if (message.type === "sidebar/ack") {
          setLog(message.payload.message);
        }
      });

      // Render the server-provided initial state immediately.
      renderState(currentState);

      // Tell the extension host that the sidebar webview is ready.
      vscode.postMessage({
        type: "sidebar/ready"
      });
    </script>
  </body>
</html>`;
}
