import type { ExtensionRuntime } from "../../state/runtime";

/**
 * Supported settings write scopes for the first settings adapters.
 */
export type SettingsScope = "user" | "workspace";

/**
 * Minimal configuration inspection shape needed by the adapters.
 *
 * Why this exists:
 * - adapters only need a small subset of what VS Code returns
 * - keeping this narrow makes testing easier
 */
export interface SettingsInspection {
  readonly defaultValue?: unknown;
  readonly globalValue?: unknown;
  readonly workspaceValue?: unknown;
  readonly workspaceFolderValue?: unknown;
}

/**
 * Small host abstraction used by settings adapters.
 *
 * Why this exists:
 * - adapters should be testable without a real VS Code runtime
 * - node:test can supply a fake host
 * - the real extension runtime can use a VS Code-backed host implementation
 */
export interface SettingsHost {
  /**
   * Inspect one setting key across scopes.
   */
  inspect(settingKey: string): SettingsInspection | undefined;

  /**
   * Update one setting key at the requested scope.
   */
  update(
    settingKey: string,
    value: unknown,
    scope: SettingsScope
  ): Promise<void>;

  /**
   * Tell the adapter whether a workspace is currently available.
   */
  hasWorkspace(): boolean;
}

/**
 * Create the real VS Code-backed settings host.
 *
 * Why this is isolated here:
 * - keeps the adapter classes free from direct runtime coupling
 * - makes adapters easy to unit test
 */
export async function createVscodeSettingsHost(
  _runtime: ExtensionRuntime
): Promise<SettingsHost> {
  const vscode = await import("vscode");

  return {
    inspect(settingKey: string): SettingsInspection | undefined {
      const inspection = vscode.workspace
        .getConfiguration()
        .inspect(settingKey);

      if (!inspection) {
        return undefined;
      }

      return {
        defaultValue: inspection.defaultValue,
        globalValue: inspection.globalValue,
        workspaceValue: inspection.workspaceValue,
        workspaceFolderValue: inspection.workspaceFolderValue,
      };
    },

    async update(
      settingKey: string,
      value: unknown,
      scope: SettingsScope
    ): Promise<void> {
      const target =
        scope === "user"
          ? vscode.ConfigurationTarget.Global
          : vscode.ConfigurationTarget.Workspace;

      await vscode.workspace
        .getConfiguration()
        .update(settingKey, value, target);
    },

    hasWorkspace(): boolean {
      return (
        (vscode.workspace.workspaceFolders?.length ?? 0) > 0 ||
        vscode.workspace.workspaceFile !== undefined
      );
    },
  };
}
