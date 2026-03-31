import type { WorkspaceSummaryViewModel } from "../explain/workspaceSummaryTypes";

/**
 * Escapes user controlled text before inserting it into HTML.
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
 * Maps tone values to CSS class names.
 */
function toneClassName(tone: string | undefined): string {
  switch (tone) {
    case "good":
      return "tone-good";
    case "warning":
      return "tone-warning";
    case "muted":
      return "tone-muted";
    default:
      return "tone-neutral";
  }
}

/**
 * Renders one section of the summary UI.
 */
function renderSection(
  section: WorkspaceSummaryViewModel["sections"][number]
): string {
  const itemsHtml =
    section.items.length > 0
      ? section.items
          .map(
            (item) => `
              <div class="item">
                <div class="item-label">${escapeHtml(item.label)}</div>
                <div class="item-value ${toneClassName(item.tone)}">${escapeHtml(
                  item.value
                )}</div>
              </div>
            `
          )
          .join("")
      : `<div class="empty">${escapeHtml(
          section.emptyMessage ?? "No data available."
        )}</div>`;

  return `
    <section class="card">
      <h2>${escapeHtml(section.title)}</h2>
      <div class="section-body">
        ${itemsHtml}
      </div>
    </section>
  `;
}
/**
 * Renders the whole read-only summary page.
 *
 * This is intentionally simple and theme-safe.
 * No JS is needed for this slice.
 */
export function renderWorkspaceSummaryHtml(
  viewModel: WorkspaceSummaryViewModel
): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(viewModel.title)}</title>
    <style>
      :root {
        color-scheme: light dark;
      }

      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-editor-foreground);
        background: var(--vscode-editor-background);
        margin: 0;
        padding: 20px;
      }

      .container {
        max-width: 960px;
        margin: 0 auto;
      }

      .hero {
        margin-bottom: 16px;
      }

      .hero h1 {
        margin: 0 0 8px;
        font-size: 22px;
      }

      .hero p {
        margin: 0;
        color: var(--vscode-descriptionForeground);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
      }

      .card {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 10px;
        padding: 14px;
        background: var(--vscode-sideBar-background);
      }

      .card h2 {
        margin: 0 0 12px;
        font-size: 15px;
      }

      .section-body {
        display: grid;
        gap: 10px;
      }

      .item {
        border-top: 1px solid var(--vscode-panel-border);
        padding-top: 10px;
      }

      .item:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .item-label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 4px;
      }

      .item-value {
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.4;
      }

      .empty {
        color: var(--vscode-descriptionForeground);
      }

      .tone-good {
        color: var(--vscode-testing-iconPassed);
      }

      .tone-warning {
        color: var(--vscode-editorWarning-foreground);
      }

      .tone-muted {
        color: var(--vscode-descriptionForeground);
      }

      .tone-neutral {
        color: var(--vscode-editor-foreground);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header class="hero">
        <h1>${escapeHtml(viewModel.title)}</h1>
        <p>${escapeHtml(viewModel.subtitle)}</p>
      </header>
      <main class="grid">
        ${viewModel.sections.map(renderSection).join("")}
      </main>
    </div>
  </body>
</html>`;
}
