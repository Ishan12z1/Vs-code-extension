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
const registerCommands_1 = require("./bootstrap/registerCommands");
const registerServices_1 = require("./bootstrap/registerServices");
const registerViews_1 = require("./bootstrap/registerViews");
/**
 * Extension entry point.
 *
 * change:
 * - extension.ts becomes a thin composition root
 * - service construction moves into bootstrap/registerServices
 * - command wiring moves into bootstrap/registerCommands
 * - view wiring moves into bootstrap/registerViews
 *
 */
function activate(context) {
    const services = (0, registerServices_1.registerServices)(context);
    services.runtime.output.appendLine("Activating VS Code Control Agent...");
    /**
     * The shared output channel is a disposable resource and must be tied
     * to the extension lifecycle.
     */
    context.subscriptions.push(services.runtime.output);
    /**
     * Register all extension surfaces through dedicated bootstrap functions.
     */
    (0, registerViews_1.registerViews)(context, services);
    (0, registerCommands_1.registerCommands)(context, services);
    /**
     * Keep the visible shell configuration in sync while the old sidebar-based
     * flow still exists. This remains transitional until later phases move more
     * behavior into the local runtime/service path.
     */
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration("controlAgent")) {
            return;
        }
        services.runtime.output.appendLine("[sidebar] controlAgent configuration changed");
        void services.sidebarProvider.refreshShellConfiguration("configuration changed");
    }));
    services.runtime.output.appendLine("VS Code Control Agent activated.");
}
function deactivate() {
    /**
     * No explicit teardown is needed yet.
     * Later phases may dispose runtime-owned resources here.
     */
}
//# sourceMappingURL=extension.js.map