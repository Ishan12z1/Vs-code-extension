import type {
  SurfaceAction,
  SurfaceState,
  ActionPreview,
  VerificationResult,
  RollbackSnapshot,
  SurfaceName,
} from "@control-agent/contracts";
/**
 * Base interface for all surface adapters.
 *
 * Why this interface matters:
 * - every writable surface should follow the same lifecycle
 * - runtime/policy/tools should interact with surfaces through one stable shape
 * - later phases can add more surfaces without reinventing the adapter contract
 *
 * Generic parameters:
 * - TAction lets a specific adapter narrow the action shape if needed later
 * - TState lets a specific adapter narrow the inspected state shape
 * - TPreview lets an adapter return richer preview data if needed
 * - TVerification lets an adapter return richer verification data if needed
 */
export interface SurfaceAdapter<
  TAction extends SurfaceAction = SurfaceAction,
  TState extends SurfaceState = SurfaceState,
  TPreview extends ActionPreview = ActionPreview,
  TVerification extends VerificationResult = VerificationResult,
> {
  /**
   * Stable surface identifier handled by this adapter.
   *
   * Examples later:
   * - userSettings
   * - workspaceSettings
   * - keybindings
   */
  readonly surfaceName: SurfaceName;

  /**
   * Inspect the current state of this surface.
   *
   * Why this is required:
   * - the runtime should understand the current state before choosing actions
   * - preview/apply/verify often depend on current state
   */
  inspect(target?: string): Promise<TState>;

  /**
   * Generate a human-readable preview of the requested action.
   *
   * This is what later approval flows and summaries will build on.
   */
  preview(action: TAction): Promise<TPreview>;

  /**
   * Apply the requested action to the real VS Code surface.
   *
   * Important:
   * - actual mutations should happen only inside surface adapters
   * - commands, UI, policy, and runtime code should not write directly
   */
  apply(action: TAction): Promise<void>;

  /**
   * Verify whether the requested action took effect.
   *
   * Verification is separate from apply because writes can partially fail
   * or drift from the expected final state.
   */
  verify(action: TAction): Promise<TVerification>;

  /**
   * Restore prior state from a rollback snapshot.
   *
   * The snapshot payload comes from the shared contracts package so rollback
   * state can be persisted and later replayed consistently.
   */
  rollback(snapshot: RollbackSnapshot): Promise<void>;
}
