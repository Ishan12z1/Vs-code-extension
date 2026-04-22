import type { ExtensionRuntime } from "../../state/runtime";

/**
 * Normalized extension lifecycle state used by the adapter.
 *
 * Why this exists:
 * - the adapter should not depend on raw VS Code extension objects
 * - keeping the shape narrow makes testing and later host implementations easier
 */
export interface ExtensionLifecycleState {
  readonly extensionId: string;
  readonly installed: boolean;
  readonly enabled: boolean;
  readonly version?: string;
}

/**
 * Host abstraction for extension lifecycle operations.
 *
 * Why this exists:
 * - the adapter should be testable without real VS Code extension APIs
 * - install/uninstall/enable/disable/update behavior is environment-specific
 * - later we can map this host to VS Code commands or other runtime integrations
 */
export interface ExtensionsHost {
  /**
   * Read the state of one extension by id.
   *
   * The adapter treats "not installed" as a valid state, not as an error.
   */
  inspectExtension(extensionId: string): Promise<ExtensionLifecycleState>;

  /**
   * Return all currently known installed extensions.
   */
  listInstalledExtensions(): Promise<ExtensionLifecycleState[]>;

  /**
   * Install an extension.
   *
   * Optional version is included now so the action shape is future-proof,
   * even if the first runtime host ignores it.
   */
  installExtension(extensionId: string, version?: string): Promise<void>;

  /**
   * Update an installed extension.
   */
  updateExtension(extensionId: string, version?: string): Promise<void>;

  /**
   * Enable an installed extension.
   */
  enableExtension(extensionId: string): Promise<void>;

  /**
   * Disable an installed extension.
   */
  disableExtension(extensionId: string): Promise<void>;

  /**
   * Uninstall an extension.
   */
  uninstallExtension(extensionId: string): Promise<void>;
}

/**
 * Create a placeholder VS Code-backed extensions host.
 *
 * Important:
 * - this intentionally does not pretend the real lifecycle plumbing is solved yet
 * - phase 5.2 is about the adapter core and contract, not the final runtime host
 *
 * If you want, we can replace this later with actual VS Code command-based wiring.
 */
export async function createVscodeExtensionsHost(
  _runtime: ExtensionRuntime
): Promise<ExtensionsHost> {
  throw new Error(
    "createVscodeExtensionsHost is not implemented yet. Use a fake/test host or add a real VS Code-backed lifecycle host later."
  );
}
