"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const registerExplainWorkspaceCommand_1 = require("./commands/registerExplainWorkspaceCommand");
const registerHelloCommand_1 = require("./commands/registerHelloCommand");
const registerInspectWorkspaceSnapshotCommand_1 = require("./commands/registerInspectWorkspaceSnapshotCommand");
const registerOpenSidebarCommand_1 = require("./commands/registerOpenSidebarCommand");
const runtime_1 = require("./state/runtime");
const ControlAgentSidebarProvider_1 = require("./webview/ControlAgentSidebarProvider");
const sidebarViewId_1 = require("./webview/sidebarViewId");
/**
 * Extension entry point.
 *
 * B5 adds:
 * - configuration change awareness for the sidebar shell
 * - keeps the sidebar as the main extension surface
 */
function activate(context) {
    const runtime = (0, runtime_1.createRuntime)(context);
    runtime.output.appendLine("Activating VS Code Control Agent...");
    context.subscriptions.push(runtime.output);
    const sidebarProvider = new ControlAgentSidebarProvider_1.ControlAgentSidebarProvider(runtime);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(sidebarViewId_1.CONTROL_AGENT_SIDEBAR_VIEW_ID, sidebarProvider));
    context.subscriptions.push((0, registerHelloCommand_1.registerHelloCommand)(runtime));
    context.subscriptions.push((0, registerInspectWorkspaceSnapshotCommand_1.registerInspectWorkspaceSnapshotCommand)(runtime));
    context.subscriptions.push((0, registerOpenSidebarCommand_1.registerOpenSidebarCommand)(runtime, sidebarProvider));
    context.subscriptions.push((0, registerExplainWorkspaceCommand_1.registerExplainWorkspaceCommand)(runtime, sidebarProvider));
    /**
     * Keep the visible shell configuration in sync when controlAgent settings change.
     */
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration("controlAgent")) {
            return;
        }
        runtime.output.appendLine("[sidebar] controlAgent configuration changed");
        void sidebarProvider.refreshShellConfiguration("configuration changed");
    }));
    runtime.output.appendLine("VS Code Control Agent activated.");
}
function deactivate() {
    // Nothing to tear down yet.
}
//# sourceMappingURL=extension.js.map