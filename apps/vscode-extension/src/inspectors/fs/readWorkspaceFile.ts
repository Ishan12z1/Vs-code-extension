import * as vscode from "vscode";

/*
*Small read result used by the .vscode/* inspector
*/
export interface WorkspaceTextFileReadResult{
    exists:boolean;
    text:string|null;
    uri:vscode.Uri;
}

/**
 * Read a file under a workspace folder.
 * missing files are trated as a normal case not an error
 */

export async function readWorkspaceTextFile(
    workspaceFolder:vscode.WorkspaceFolder,
    relativePath:string
):Promise<WorkspaceTextFileReadResult>{
    const uri = vscode.Uri.joinPath(workspaceFolder.uri,relativePath);
    try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const text = new TextDecoder("utf-8").decode(bytes);

    return {
      exists: true,
      text,
      uri
    };
  } catch {
    return {
      exists: false,
      text: null,
      uri
    };
  }
}
