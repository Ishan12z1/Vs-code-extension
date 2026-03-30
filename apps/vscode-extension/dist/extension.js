"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const registerHelloCommand_1 = require("./commands/registerHelloCommand");
const registerInspectWorkspaceSnapshotCommand_1 = require("./commands/registerInspectWorkspaceSnapshotCommand");
const registerExplainWorkspaceCommand_1 = require("./commands/registerExplainWorkspaceCommand");
const runtime_1 = require("./state/runtime");
function activate(context) {
    const runtime = (0, runtime_1.createRuntime)(context);
    runtime.output.appendLine("Activating VS Code Control Agent...");
    context.subscriptions.push(runtime.output);
    /**
     * Bootstrap/dev commands.
     */
    context.subscriptions.push((0, registerHelloCommand_1.registerHelloCommand)(runtime));
    context.subscriptions.push((0, registerInspectWorkspaceSnapshotCommand_1.registerInspectWorkspaceSnapshotCommand)(runtime));
    /**
     * user-facing read-only explanation command.
     */
    context.subscriptions.push((0, registerExplainWorkspaceCommand_1.registerExplainWorkspaceCommand)(runtime));
    runtime.output.appendLine("VS Code Control Agent activated.");
}
function deactivate() {
    // Keep empty for now.
}
//# sourceMappingURL=extension.js.map