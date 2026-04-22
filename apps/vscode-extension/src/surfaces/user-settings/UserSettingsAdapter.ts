import type { SurfaceName } from "@control-agent/contracts";
import type { ExtensionRuntime } from "../../state/runtime";
import { BaseSettingsAdapter } from "../settings/BaseSettingsAdapter";
import type {
  SettingsHost,
  SettingsInspection,
} from "../settings/settingsHost";

/**
 * Surface adapter for user/global settings.
 */
export class UserSettingsAdapter extends BaseSettingsAdapter {
  public readonly surfaceName: SurfaceName = "userSettings";

  /**
   * User settings write to the user/global scope.
   */
  protected readonly settingsScope = "user" as const;

  protected readonly surfaceLabel = "User setting";

  public constructor(runtime: ExtensionRuntime, settingsHost: SettingsHost) {
    super(runtime, settingsHost);
  }

  /**
   * For user settings, the relevant inspected value is the global value.
   */
  protected readScopedValue(
    inspection: SettingsInspection | undefined
  ): unknown {
    return inspection?.globalValue;
  }
}
