import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_APPROVAL_PLACEHOLDER,
  createInitialSidebarHostState,
} from "../src/state/sidebarState";
import {
  classifyShellPrompt,
  isExplainLikePrompt,
} from "../src/webview/classifyShellPrompt";
import { renderSidebarShellHtml } from "../src/webview/renderSidebarShellHtml";

test("createInitialSidebarHostState returns expected shell defaults", () => {
  const state = createInitialSidebarHostState({
    backendUrl: "http://127.0.0.1:8000",
    debugLogsEnabled: false,
  });

  assert.equal(state.mode, "idle");
  assert.equal(state.screen, "home");
  assert.equal(state.ready, false);
  assert.equal(state.viewMounted, false);
  assert.equal(state.approvalPlaceholder, DEFAULT_APPROVAL_PLACEHOLDER);
});

test("classifyShellPrompt detects explain-like prompts", () => {
  const classification = classifyShellPrompt(
    "Explain my current VS Code setup",
  );

  assert.equal(classification.route, "explain");
  assert.equal(isExplainLikePrompt("Explain my current VS Code setup"), true);
});

test("classifyShellPrompt detects configure prompts", () => {
  const classification = classifyShellPrompt(
    "Enable format on save for this workspace",
  );

  assert.equal(classification.route, "configure");
});

test("renderSidebarShellHtml includes the core shell UI", () => {
  const html = renderSidebarShellHtml({
    title: "Control Agent",
    subtitle: "Sidebar shell",
    initialState: createInitialSidebarHostState({
      backendUrl: "http://127.0.0.1:8000",
      debugLogsEnabled: false,
    }),
  });

  assert.match(html, /Assistant prompt/);
  assert.match(html, /Explain current VS Code setup/);
  assert.match(html, /Approval \/ apply/);
  assert.match(html, /Response \/ plan area/);
});