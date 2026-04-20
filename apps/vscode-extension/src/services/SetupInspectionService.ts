import type { WorkspaceSnapshot } from "@control-agent/contracts";
import { createDefaultInspectors } from "../inspectors/createDefaultInspectors";
import { WorkspaceSnapshotBuilder } from "../inspectors/WorkspaceSnapshotBuilder";
import type { ExtensionRuntime } from "../state/runtime";

/**
 * Service responsible for collecting a normalized workspace snapshot.
 *
 * Why this exists:
 * - command handlers should not construct builders and inspectors directly
 * - snapshot collection is application logic, not command wiring
 * - later phases can add caching, persistence, and richer inspection rules here
 */
export class SetupInspectionService {
  public constructor(private readonly runtime: ExtensionRuntime) {}

  /**
   * Collect the current workspace snapshot using the existing inspector pipeline.
   *
   * Current phase note:
   * - this still uses the current inspector system under the hood
   * - the important change is that commands no longer own this logic
   */
  public async collectSnapshot(): Promise<WorkspaceSnapshot> {
    const builder = new WorkspaceSnapshotBuilder(
      this.runtime,
      createDefaultInspectors()
    );

    return builder.build();
  }
}
