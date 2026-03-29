/* This file reads workspace folder information from the context and turns it into a partial snapshot */

import * as vscode from "vscode";
import type { WorkspaceInspector, InspectionContext } from "../types";
import { WorkspaceSnapshot } from "@control-agent/contracts";

/**
 * Bootstrap inspector.
 * This gives the builder one real signal immediately:
 * open workspace folders + whether a .code-workspace file is open.
 *
 * This is intentionally small.
 * Settings, file presence, .vscode/*, and extensions come next.
 */
export class WorkspaceFoldersInspector implements WorkspaceInspector {
    public readonly id ="workspaceFolders";

    public async inspect(
     context: InspectionContext
     ): Promise<ReturnType<WorkspaceFoldersInspector["buildPartialSnapshot"]>> { 
        return this.buildPartialSnapshot(
            context.workspaceFolders,
            context.workspaceFile
        );
    };
    
    /*Convert vscode folders information into a proper format for inspect function to use*/
    private buildPartialSnapshot(
        workspaceFolders:readonly vscode.WorkspaceFolder[],
        workspaceFile:vscode.Uri|undefined
    ){
        return {
            workspaceFolders:workspaceFolders.map((folder)=>({
                name:folder.name,
                uri:folder.uri.toString()
            })),
            hasWorkspaceFile : Boolean(workspaceFile)
        };
    }
    }
