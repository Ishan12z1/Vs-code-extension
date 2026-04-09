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
 */
function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

/**
 * Renders the B3 sidebar shell.
 *
 * New in B3:
 * - the sidebar can trigger the explain flow
 * - the explain result is rendered inside the sidebar
 * - the old separate panel stops being the main UX
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

      .section-grid {
        display: grid;
        gap: 10px;
      }

      .summary-section {
        border-top: 1px solid var(--vscode-panel-border);
        padding-top: 10px;
      }

      .summary-section:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .summary-section h3 {
        margin: 0 0 8px;
        font-size: 13px;
      }

      .summary-item {
        margin-bottom: 8px;
      }

      .summary-item:last-child {
        margin-bottom: 0;
      }

      .summary-label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 3px;
      }

      .summary-value {
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .hidden {
        display: none;
      }

      .error-box {
        border: 1px solid var(--vscode-editorError-border, var(--vscode-errorForeground));
        border-radius: 8px;
        padding: 10px;
        color: var(--vscode-errorForeground);
        background: var(--vscode-inputValidation-errorBackground, transparent);
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
            <div class="status-label">Screen</div>
            <div class="status-value" id="screenValue">home</div>
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
        <h2>Assistant actions</h2>
        <p style="margin-bottom: 10px;">
          B3 moves the existing explain flow into this sidebar shell.
        </p>
        <div class="controls">
          <button id="explainWorkspaceButton" type="button">Explain current VS Code setup</button>
          <button id="showHomeButton" type="button">Show home</button>
          <button id="requestStateButton" type="button">Request current state</button>
          <button id="pingHostButton" type="button">Send ping to host</button>
        </div>
      </section>

      <section class="card" id="errorCard">
        <h2>Error</h2>
        <div class="error-box" id="errorValue">No error.</div>
      </section>

      <section class="card" id="homeCard">
        <h2>Home</h2>
        <p>
          This is the real sidebar shell. Use the explain action above to render the current
          workspace explanation inside the sidebar instead of a separate panel.
        </p>
      </section>

      <section class="card hidden" id="explanationCard">
        <h2 id="explanationTitle">Current VS Code setup</h2>
        <p id="explanationSubtitle" style="margin-bottom: 10px;"></p>
        <div class="section-grid" id="explanationSections"></div>
      </section>

      <section class="card">
        <h2>Bridge log</h2>
        <p class="log muted" id="logValue">No messages yet.</p>
      </section>
    </div>

    <script>
      const vscode = acquireVsCodeApi();
      let currentState = ${initialStateJson};

      const modeValue = document.getElementById("modeValue");
      const screenValue = document.getElementById("screenValue");
      const readyValue = document.getElementById("readyValue");
      const mountedValue = document.getElementById("mountedValue");
      const statusMessageValue = document.getElementById("statusMessageValue");
      const lastEventValue = document.getElementById("lastEventValue");
      const debugLogsValue = document.getElementById("debugLogsValue");
      const logValue = document.getElementById("logValue");

      const explainWorkspaceButton = document.getElementById("explainWorkspaceButton");
      const showHomeButton = document.getElementById("showHomeButton");
      const requestStateButton = document.getElementById("requestStateButton");
      const pingHostButton = document.getElementById("pingHostButton");

      const homeCard = document.getElementById("homeCard");
      const errorCard = document.getElementById("errorCard");
      const errorValue = document.getElementById("errorValue");
      const explanationCard = document.getElementById("explanationCard");
      const explanationTitle = document.getElementById("explanationTitle");
      const explanationSubtitle = document.getElementById("explanationSubtitle");
      const explanationSections = document.getElementById("explanationSections");

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      function setLog(message) {
        logValue.textContent = message;
      }

      function renderSummarySection(section) {
        const itemsHtml =
          section.items.length > 0
            ? section.items
                .map(
                  (item) => \`
                    <div class="summary-item">
                      <div class="summary-label">\${escapeHtml(item.label)}</div>
                      <div class="summary-value">\${escapeHtml(item.value)}</div>
                    </div>
                  \`
                )
                .join("")
            : \`<p class="muted">\${escapeHtml(section.emptyMessage ?? "No data available.")}</p>\`;

        return \`
          <div class="summary-section">
            <h3>\${escapeHtml(section.title)}</h3>
            \${itemsHtml}
          </div>
        \`;
      }

      function renderExplanation(explanation) {
        if (!explanation) {
          explanationCard.classList.add("hidden");
          explanationSections.innerHTML = "";
          explanationSubtitle.textContent = "";
          return;
        }

        explanationCard.classList.remove("hidden");
        explanationTitle.textContent = explanation.title;
        explanationSubtitle.textContent = explanation.subtitle;
        explanationSections.innerHTML = explanation.sections
          .map(renderSummarySection)
          .join("");
      }

      function renderError(errorMessage) {
        if (!errorMessage) {
          errorCard.classList.add("hidden");
          errorValue.textContent = "No error.";
          return;
        }

        errorCard.classList.remove("hidden");
        errorValue.textContent = errorMessage;
      }

      function renderScreen(screen) {
        homeCard.classList.toggle("hidden", screen !== "home");
      }

      function renderState(state) {
        currentState = state;

        modeValue.textContent = state.mode;
        screenValue.textContent = state.screen;
        readyValue.textContent = state.ready ? "Yes" : "No";
        mountedValue.textContent = state.viewMounted ? "Yes" : "No";
        statusMessageValue.textContent = state.statusMessage;
        lastEventValue.textContent = state.lastEvent ?? "None";
        debugLogsValue.textContent = state.debugLogsEnabled ? "Yes" : "No";

        readyValue.className = "status-value " + (state.ready ? "good" : "warning");
        mountedValue.className = "status-value " + (state.viewMounted ? "good" : "warning");

        renderScreen(state.screen);
        renderExplanation(state.explanation);
        renderError(state.errorMessage);
      }

      explainWorkspaceButton.addEventListener("click", () => {
        vscode.postMessage({
          type: "sidebar/triggerExplainWorkspace"
        });
      });

      showHomeButton.addEventListener("click", () => {
        vscode.postMessage({
          type: "sidebar/showHome"
        });
      });

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

      renderState(currentState);

      vscode.postMessage({
        type: "sidebar/ready"
      });
    </script>
  </body>
</html>`;
}
