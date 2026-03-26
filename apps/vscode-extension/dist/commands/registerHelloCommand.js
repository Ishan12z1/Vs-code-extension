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
exports.registerHelloCommand = registerHelloCommand;
const vscode = __importStar(require("vscode"));
function registerHelloCommand(runtime) {
    return vscode.commands.registerCommand("controlAgent.hello", async () => {
        const config = vscode.workspace.getConfiguration("controlAgent");
        const backendUrl = config.get("backendUrl", "http://127.0.0.1:8000");
        const enableDebugLogs = config.get("enableDebugLogs", false);
        runtime.output.appendLine("[command] controlAgent.hello");
        runtime.output.appendLine(`[config] backendUrl=${backendUrl}`);
        runtime.output.appendLine(`[config] enableDebugLogs=${enableDebugLogs}`);
        if (enableDebugLogs) {
            runtime.output.show(true);
        }
        await vscode.window.showInformationMessage("VS Code Control Agent booted successfully.");
    });
}
//# sourceMappingURL=registerHelloCommand.js.map