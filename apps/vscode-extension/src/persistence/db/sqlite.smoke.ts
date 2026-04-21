import {
  closeSqliteDatabase,
  openSqliteDatabase,
  verifySqliteConnection,
} from "./sqlite";
import type { ExtensionRuntime } from "../../state/runtime";

/**
 * Temporary helper used only during early persistence bring-up.
 *
 * Phase switch note:
 * - openSqliteDatabase is now async because sql.js initialization is async
 * - closing should go through closeSqliteDatabase so the DB is persisted first
 */
export async function runSqliteSmokeCheck(
  runtime: ExtensionRuntime
): Promise<void> {
  const db = await openSqliteDatabase(runtime);

  try {
    const value = verifySqliteConnection(db);

    runtime.output.appendLine(
      `[persistence] sqlite smoke check returned: ${value}`
    );
  } finally {
    closeSqliteDatabase(runtime, db);
  }
}
