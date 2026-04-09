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
 * Renders the minimal sidebar shell for B1.
 *
 * This is intentionally static for now.
 * B2 will add message passing and dynamic state updates.
 * B3 will move the explain flow into this shell.
 */
export function renderSidebarShellHtml(options: {
  title: string;
  subtitle: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline';"
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

      .hero {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 10px;
        padding: 14px;
        background: var(--vscode-editor-background);
      }

      .hero h1 {
        margin: 0 0 6px;
        font-size: 18px;
      }

      .hero p {
        margin: 0;
        color: var(--vscode-descriptionForeground);
        line-height: 1.4;
      }

      .card {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 10px;
        padding: 14px;
        background: var(--vscode-editor-background);
      }

      .card h2 {
        margin: 0 0 8px;
        font-size: 13px;
      }

      .card p {
        margin: 0;
        color: var(--vscode-descriptionForeground);
        line-height: 1.4;
      }

      .status {
        color: var(--vscode-testing-iconQueued);
        font-weight: 600;
      }

      .muted {
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
        <h2>Shell status</h2>
        <p class="status">Sidebar shell registered successfully.</p>
      </section>

      <section class="card">
        <h2>What comes next</h2>
        <p>
          B1 only creates the real sidebar home for the assistant.
          Message passing, explain rendering, and prompt handling come in the next slices.
        </p>
      </section>

      <section class="card">
        <h2>Current state</h2>
        <p class="muted">
          The extension host owns the shell. The webview is mounted inside the sidebar.
        </p>
      </section>
    </div>
  </body>
</html>`;
}
