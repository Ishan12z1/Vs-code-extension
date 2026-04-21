import { openSqliteDatabase, verifySqliteConnection } from "./sqlite";
import type { ExtensionRuntime } from "../../state/runtime";

/**
 * Temporary helper used only during early persistence bring-up.
 *
 * Later phases may remove this or replace it with real tests.
 */
export function runSqliteSmokeCheck(runtime: ExtensionRuntime): void {
  const db = openSqliteDatabase(runtime);

  try {
    const value = verifySqliteConnection(db);

    runtime.output.appendLine(
      `[persistence] sqlite smoke check returned: ${value}`
    );
  } finally {
    db.close();
  }
}
