import * as vscode from "vscode";
/**
 * Finds root level marker files inside one workspace folder.
 * 
 *  * We keep this intentionally scoped:
 * - search is relative to one workspace folder
 * - patterns are root-level patterns from the current slice
 * - maxResults is small because these are marker files, not content search
 */
export async function findWorkspaceMarkerFiles(
  workspaceFolder: vscode.WorkspaceFolder,
  pattern: string,
  maxResults = 10
): Promise<readonly vscode.Uri[]> {
  return vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, pattern),
    /**
     * Exclude common heavy directories just in case a pattern broadens later.
     * For the current root-level patterns this is mostly defensive.
     */
    "**/{node_modules,.git,dist,build,out}/**",
    maxResults
  );
}