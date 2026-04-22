import type { SurfaceName } from "@control-agent/contracts";
import type { ExtensionRuntime } from "../../state/runtime";
import { BaseSettingsAdapter } from "../settings/BaseSettingsAdapter";
import type {
  SettingsHost,
  SettingsInspection,
} from "../settings/settingsHost";

/**
 * Surface adapter for workspace settings.
 */
export class WorkspaceSettingsAdapter extends BaseSettingsAdapter {
  public readonly surfaceName: SurfaceName = "workspaceSettings";

  /**
   * Workspace settings write to the workspace scope.
   */
  protected readonly settingsScope = "workspace" as const;

  protected readonly surfaceLabel = "Workspace setting";

  public constructor(runtime: ExtensionRuntime, settingsHost: SettingsHost) {
    super(runtime, settingsHost);
  }

  /**
   * For workspace settings, the relevant inspected value is the workspace value.
   */
  protected readScopedValue(
    inspection: SettingsInspection | undefined
  ): unknown {
    return inspection?.workspaceValue;
  }

  /**
   * Workspace writes require an open workspace.
   */
  protected override assertWorkspaceAvailabilityIfNeeded(): void {
    if (!this.settingsHost.hasWorkspace()) {
      throw new Error(
        "Cannot apply or roll back workspace settings without an open workspace."
      );
    }
  }
}
