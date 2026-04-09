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
 * Renders the B5 sidebar shell.
 *
 * B5 keeps the B4 shell, but adds:
 * - visible config card
 * - refresh shell action
 * - host acknowledgement area
 * - theme-safe cleanup
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
      .card h2,
      .summary-section h3 {
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

      .status-grid,
      .section-grid,
      .stack {
        display: grid;
        gap: 10px;
      }

      .status-row,
      .summary-section {
        border-top: 1px solid var(--vscode-panel-border);
        padding-top: 10px;
      }

      .status-row:first-child,
      .summary-section:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .status-label,
      .summary-label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 4px;
      }

      .status-value {
        font-weight: 600;
        line-height: 1.4;
        word-break: break-word;
      }

      .summary-item {
        margin-bottom: 8px;
      }

      .summary-item:last-child {
        margin-bottom: 0;
      }

      .summary-value {
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-word;
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

      textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 96px;
        resize: vertical;
        border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
        border-radius: 8px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        padding: 10px;
        font: inherit;
      }

      .list {
        margin: 0;
        padding-left: 18px;
      }

      .log {
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

      .ack-box {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        padding: 10px;
        background: var(--vscode-sideBar-background);
        color: var(--vscode-descriptionForeground);
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
        <h2>Assistant prompt</h2>
        <div class="stack">
          <textarea
            id="promptInput"
            placeholder="Ask something like: Explain my current VS Code setup"
          ></textarea>
          <div class="controls">
            <button id="submitPromptButton" type="button">Submit</button>
            <button id="explainWorkspaceButton" type="button">Explain current VS Code setup</button>
            <button id="showHomeButton" type="button">Show home</button>
          </div>
        </div>
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
        </div>
      </section>

      <section class="card">
        <h2>Shell configuration</h2>
        <div class="status-grid">
          <div class="status-row">
            <div class="status-label">Backend URL</div>
            <div class="status-value" id="backendUrlValue">Unknown</div>
          </div>

          <div class="status-row">
            <div class="status-label">Debug logs enabled</div>
            <div class="status-value" id="debugLogsValue">No</div>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Activity</h2>
        <ul class="list" id="activityList"></ul>
      </section>

      <section class="card hidden" id="resultCard">
        <h2 id="resultTitle">Response / plan area</h2>
        <p id="resultBody"></p>
      </section>

      <section class="card hidden" id="explanationCard">
        <h2 id="explanationTitle">Current VS Code setup</h2>
        <p id="explanationSubtitle" style="margin-bottom: 10px;"></p>
        <div class="section-grid" id="explanationSections"></div>
      </section>

      <section class="card">
        <h2>Approval / apply</h2>
        <p id="approvalPlaceholder"></p>
      </section>

      <section class="card hidden" id="errorCard">
        <h2>Error</h2>
        <div class="error-box" id="errorValue">No error.</div>
      </section>

      <section class="card">
        <h2>Logs</h2>
        <p class="log muted" id="logsValue">No logs yet.</p>
      </section>

      <section class="card">
        <h2>Shell tools</h2>
        <div class="controls" style="margin-bottom: 10px;">
          <button id="requestStateButton" type="button">Request current state</button>
          <button id="pingHostButton" type="button">Send ping to host</button>
          <button id="refreshShellButton" type="button">Refresh shell state</button>
        </div>
        <div class="ack-box" id="ackValue">No host acknowledgements yet.</div>
      </section>
    </div>

    <script>
      const vscode = acquireVsCodeApi();
      let currentState = ${initialStateJson};

      const promptInput = document.getElementById("promptInput");
      const submitPromptButton = document.getElementById("submitPromptButton");
      const explainWorkspaceButton = document.getElementById("explainWorkspaceButton");
      const showHomeButton = document.getElementById("showHomeButton");
      const requestStateButton = document.getElementById("requestStateButton");
      const pingHostButton = document.getElementById("pingHostButton");
      const refreshShellButton = document.getElementById("refreshShellButton");

      const modeValue = document.getElementById("modeValue");
      const screenValue = document.getElementById("screenValue");
      const readyValue = document.getElementById("readyValue");
      const mountedValue = document.getElementById("mountedValue");
      const statusMessageValue = document.getElementById("statusMessageValue");
      const lastEventValue = document.getElementById("lastEventValue");
      const backendUrlValue = document.getElementById("backendUrlValue");
      const debugLogsValue = document.getElementById("debugLogsValue");

      const activityList = document.getElementById("activityList");
      const resultCard = document.getElementById("resultCard");
      const resultTitle = document.getElementById("resultTitle");
      const resultBody = document.getElementById("resultBody");

      const explanationCard = document.getElementById("explanationCard");
      const explanationTitle = document.getElementById("explanationTitle");
      const explanationSubtitle = document.getElementById("explanationSubtitle");
      const explanationSections = document.getElementById("explanationSections");

      const approvalPlaceholder = document.getElementById("approvalPlaceholder");
      const errorCard = document.getElementById("errorCard");
      const errorValue = document.getElementById("errorValue");
      const logsValue = document.getElementById("logsValue");
      const ackValue = document.getElementById("ackValue");

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
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
                  \`,
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

      function renderActivity(items) {
        if (!items || items.length === 0) {
          activityList.innerHTML = '<li class="muted">No activity yet.</li>';
          return;
        }

        activityList.innerHTML = items
          .map((item) => \`<li>\${escapeHtml(item)}</li>\`)
          .join("");
      }

      function renderResult(state) {
        const hasResult = Boolean(state.resultTitle || state.resultBody);

        resultCard.classList.toggle("hidden", !hasResult);

        if (!hasResult) {
          resultTitle.textContent = "Response / plan area";
          resultBody.textContent = "";
          return;
        }

        resultTitle.textContent = state.resultTitle ?? "Response / plan area";
        resultBody.textContent = state.resultBody ?? "";
      }

      function renderExplanation(explanation) {
        if (!explanation) {
          explanationCard.classList.add("hidden");
          explanationTitle.textContent = "Current VS Code setup";
          explanationSubtitle.textContent = "";
          explanationSections.innerHTML = "";
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
        const hasError = Boolean(errorMessage);

        errorCard.classList.toggle("hidden", !hasError);

        if (!hasError) {
          errorValue.textContent = "No error.";
          return;
        }

        errorValue.textContent = errorMessage;
      }

      function renderLogs(items) {
        if (!items || items.length === 0) {
          logsValue.textContent = "No logs yet.";
          return;
        }

        logsValue.textContent = items.join("\\n");
      }

      function renderState(state) {
        currentState = state;

        promptInput.value = state.promptDraft;
        modeValue.textContent = state.mode;
        screenValue.textContent = state.screen;
        readyValue.textContent = state.ready ? "Yes" : "No";
        mountedValue.textContent = state.viewMounted ? "Yes" : "No";
        statusMessageValue.textContent = state.statusMessage;
        lastEventValue.textContent = state.lastEvent ?? "None";
        backendUrlValue.textContent = state.config.backendUrl;
        debugLogsValue.textContent = state.config.debugLogsEnabled ? "Yes" : "No";

        readyValue.className = "status-value " + (state.ready ? "good" : "warning");
        mountedValue.className = "status-value " + (state.viewMounted ? "good" : "warning");
        debugLogsValue.className =
          "status-value " + (state.config.debugLogsEnabled ? "good" : "muted");

        approvalPlaceholder.textContent = state.approvalPlaceholder;

        renderActivity(state.activityItems);
        renderResult(state);
        renderExplanation(state.explanation);
        renderError(state.errorMessage);
        renderLogs(state.logs);
      }

      promptInput.addEventListener("input", () => {
        vscode.postMessage({
          type: "sidebar/updatePromptDraft",
          payload: {
            prompt: promptInput.value,
          },
        });
      });

      submitPromptButton.addEventListener("click", () => {
        vscode.postMessage({
          type: "sidebar/submitPrompt",
          payload: {
            prompt: promptInput.value,
          },
        });
      });

      explainWorkspaceButton.addEventListener("click", () => {
        vscode.postMessage({
          type: "sidebar/triggerExplainWorkspace",
        });
      });

      showHomeButton.addEventListener("click", () => {
        vscode.postMessage({
          type: "sidebar/showHome",
        });
      });

      requestStateButton.addEventListener("click", () => {
        vscode.postMessage({
          type: "sidebar/requestState",
        });
      });

      pingHostButton.addEventListener("click", () => {
        vscode.postMessage({
          type: "sidebar/ping",
          payload: {
            sentAt: new Date().toISOString(),
          },
        });
      });

      refreshShellButton.addEventListener("click", () => {
        vscode.postMessage({
          type: "sidebar/refreshShell",
        });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;

        if (!message || typeof message.type !== "string") {
          return;
        }

        if (message.type === "sidebar/stateUpdated") {
          renderState(message.payload);
          return;
        }

        if (message.type === "sidebar/ack") {
          ackValue.textContent = message.payload.message;
        }
      });

      renderState(currentState);

      vscode.postMessage({
        type: "sidebar/ready",
      });
    </script>
  </body>
</html>`;
}
