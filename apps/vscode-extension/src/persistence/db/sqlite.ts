import * as fs from "node:fs";
import * as path from "node:path";
import initSqlJs from "sql.js";
import type { ExtensionRuntime } from "../../state/runtime";

/**
 * Lightweight structural type for the sql.js database handle.
 *
 * Why a structural type instead of deep package-specific typing:
 * - keeps the rest of the code decoupled from sql.js internals
 * - gives repositories a stable interface to work against
 * - makes it easier to change the backing implementation later if needed
 */
interface SqlJsDatabaseHandle {
  run(sql: string, params?: unknown): void;
  exec(sql: string): Array<{
    columns: string[];
    values: unknown[][];
  }>;
  prepare(sql: string): {
    bind(params?: unknown): void;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  };
  export(): Uint8Array;
  close(): void;
}

/**
 * Lightweight structural type for the sql.js module.
 */
interface SqlJsModuleHandle {
  Database: new (data?: Uint8Array) => SqlJsDatabaseHandle;
}

/**
 * Supported SQL parameter shapes used by repositories.
 */
export type SqlParameters =
  | readonly unknown[]
  | Record<string, unknown>
  | undefined;

/**
 * Wrapper for the open sql.js database plus its file location.
 *
 * Why this wrapper exists:
 * - sql.js is an in-memory database engine
 * - durability comes from reading/writing the serialized DB file ourselves
 * - repositories should not need to know those file details
 */
export interface SqliteDatabase {
  readonly module: SqlJsModuleHandle;
  readonly db: SqlJsDatabaseHandle;
  readonly databaseFile: string;
}

/**
 * Filesystem locations used by the local persistence layer.
 */
export interface PersistencePaths {
  /**
   * Root folder for all local extension persistence.
   */
  readonly rootDir: string;

  /**
   * SQLite file path for runtime metadata.
   */
  readonly databaseFile: string;
}

/**
 * One migration file discovered on disk.
 */
interface SqliteMigration {
  readonly id: string;
  readonly filePath: string;
  readonly sql: string;
}

/**
 * Resolve the persistence paths for the current extension instance.
 *
 * We use VS Code's global storage location so the DB survives across sessions
 * and remains owned by the extension.
 */
export function resolvePersistencePaths(
  runtime: ExtensionRuntime
): PersistencePaths {
  const rootDir = runtime.context.globalStorageUri.fsPath;

  return {
    rootDir,
    databaseFile: path.join(rootDir, "control-agent.sqlite"),
  };
}

/**
 * Ensure the extension persistence directory exists before opening the DB.
 */
export function ensurePersistenceDirectory(
  runtime: ExtensionRuntime
): PersistencePaths {
  const paths = resolvePersistencePaths(runtime);

  fs.mkdirSync(paths.rootDir, { recursive: true });

  return paths;
}

/**
 * Resolve migration directories.
 *
 * Why both src and dist are checked:
 * - TypeScript does not automatically copy .sql files into dist
 * - during local development, reading from src is convenient
 * - later packaging work should ensure migrations are included in the final extension
 */
function resolveMigrationDirectories(runtime: ExtensionRuntime): string[] {
  const extensionRoot = runtime.extensionUri.fsPath;

  return [
    path.join(extensionRoot, "dist", "persistence", "db", "migrations"),
    path.join(extensionRoot, "src", "persistence", "db", "migrations"),
  ];
}

/**
 * Pick the first migration directory that actually exists.
 */
function resolveExistingMigrationDirectory(runtime: ExtensionRuntime): string {
  for (const dirPath of resolveMigrationDirectories(runtime)) {
    if (fs.existsSync(dirPath)) {
      return dirPath;
    }
  }

  throw new Error(
    "No migration directory found. Expected one of: " +
      resolveMigrationDirectories(runtime).join(", ")
  );
}

/**
 * Resolve the sql.js WASM asset path.
 *
 * Why require.resolve:
 * - gives us the installed package asset path directly
 * - avoids hard-coding a fragile node_modules path manually
 */
function resolveSqlJsWasmPath(): string {
  return require.resolve("sql.js/dist/sql-wasm.wasm");
}

/**
 * Create and initialize the sql.js module.
 *
 * Important:
 * - sql.js initialization is async
 * - this is the main behavior difference from better-sqlite3
 */
async function loadSqlJsModule(): Promise<SqlJsModuleHandle> {
  const wasmPath = resolveSqlJsWasmPath();

  const sqlModule = await initSqlJs({
    locateFile: () => wasmPath,
  });

  return sqlModule as unknown as SqlJsModuleHandle;
}

/**
 * Load an existing serialized database file if present.
 */
function loadExistingDatabaseBytes(
  databaseFile: string
): Uint8Array | undefined {
  if (!fs.existsSync(databaseFile)) {
    return undefined;
  }

  return fs.readFileSync(databaseFile);
}

/**
 * Persist the current in-memory sql.js database to disk.
 *
 * Why this exists:
 * - sql.js is in-memory at runtime
 * - durability requires exporting the DB bytes after writes
 */
export function persistSqliteDatabase(db: SqliteDatabase): void {
  const bytes = db.db.export();
  fs.writeFileSync(db.databaseFile, Buffer.from(bytes));
}

/**
 * Ensure the migration bookkeeping table exists.
 *
 * Important:
 * - this is intentionally created by the runner itself
 * - we do not put it inside 001_init.sql because the runner needs it
 *   before normal migrations can be tracked safely
 */
function ensureMigrationTable(db: SqliteDatabase): void {
  db.db.run(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

/**
 * Read the set of already-applied migration ids.
 */
function getAppliedMigrationIds(db: SqliteDatabase): Set<string> {
  const rows = queryAll<{ id: string }>(
    db,
    "SELECT id FROM _schema_migrations ORDER BY id ASC"
  );

  return new Set(rows.map((row) => row.id));
}

/**
 * Load migration files from disk in lexical order.
 */
function loadMigrationsFromDirectory(dirPath: string): SqliteMigration[] {
  const fileNames = fs
    .readdirSync(dirPath)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  return fileNames.map((fileName) => {
    const filePath = path.join(dirPath, fileName);

    return {
      id: fileName,
      filePath,
      sql: fs.readFileSync(filePath, "utf8"),
    };
  });
}

/**
 * Apply pending migrations exactly once.
 *
 * sql.js does not give us the same transaction helper shape as better-sqlite3,
 * so we explicitly bracket each migration with BEGIN/COMMIT/ROLLBACK.
 */
export function applySqliteMigrations(
  runtime: ExtensionRuntime,
  db: SqliteDatabase
): void {
  ensureMigrationTable(db);

  const migrationDir = resolveExistingMigrationDirectory(runtime);
  const migrations = loadMigrationsFromDirectory(migrationDir);
  const appliedIds = getAppliedMigrationIds(db);

  runtime.output.appendLine(
    `[persistence] using migration directory: ${migrationDir}`
  );

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      runtime.output.appendLine(
        `[persistence] migration already applied: ${migration.id}`
      );
      continue;
    }

    runtime.output.appendLine(
      `[persistence] applying migration: ${migration.id}`
    );

    try {
      db.db.run("BEGIN");
      db.db.run(migration.sql);
      db.db.run(
        `
          INSERT INTO _schema_migrations (id, applied_at)
          VALUES (?, ?)
        `,
        [migration.id, new Date().toISOString()]
      );
      db.db.run("COMMIT");
    } catch (error) {
      db.db.run("ROLLBACK");
      throw error;
    }
  }

  /**
   * Persist the migrated DB so the schema survives reloads.
   */
  persistSqliteDatabase(db);
}

/**
 * Open the local SQLite database for the extension.
 *
 * Phase switch note:
 * - sql.js initialization is async
 * - the DB is loaded from disk into memory
 * - migrations are applied
 * - the caller receives a durable wrapper
 */
export async function openSqliteDatabase(
  runtime: ExtensionRuntime
): Promise<SqliteDatabase> {
  const paths = ensurePersistenceDirectory(runtime);

  runtime.output.appendLine(
    `[persistence] opening sqlite database at ${paths.databaseFile}`
  );

  const sqlModule = await loadSqlJsModule();
  const existingBytes = loadExistingDatabaseBytes(paths.databaseFile);
  const dbHandle = new sqlModule.Database(existingBytes);

  const db: SqliteDatabase = {
    module: sqlModule,
    db: dbHandle,
    databaseFile: paths.databaseFile,
  };

  /**
   * Bring the DB schema up to date before returning the handle.
   */
  applySqliteMigrations(runtime, db);

  return db;
}

/**
 * Close the SQLite database safely.
 *
 * We persist one final time before closing so in-memory state is not lost.
 */
export function closeSqliteDatabase(
  runtime: ExtensionRuntime,
  db: SqliteDatabase
): void {
  runtime.output.appendLine("[persistence] closing sqlite database");
  persistSqliteDatabase(db);
  db.db.close();
}

/**
 * Execute one mutating SQL statement and persist the DB immediately.
 *
 * Why immediate persistence:
 * - keeps behavior simple and durable during early bring-up
 * - avoids having to invent a unit-of-work abstraction too early
 */
export function executeMutation(
  db: SqliteDatabase,
  sql: string,
  params?: SqlParameters
): void {
  db.db.run(sql, params);
  persistSqliteDatabase(db);
}

/**
 * Execute a query and return all rows as typed objects.
 */
export function queryAll<T>(
  db: SqliteDatabase,
  sql: string,
  params?: SqlParameters
): T[] {
  const statement = db.db.prepare(sql);

  try {
    if (params !== undefined) {
      statement.bind(params);
    }

    const rows: T[] = [];

    while (statement.step()) {
      rows.push(statement.getAsObject() as T);
    }

    return rows;
  } finally {
    statement.free();
  }
}

/**
 * Execute a query and return one row or null.
 */
export function queryOne<T>(
  db: SqliteDatabase,
  sql: string,
  params?: SqlParameters
): T | null {
  const rows = queryAll<T>(db, sql, params);
  return rows[0] ?? null;
}

/**
 * Lightweight proof-of-life helper for the DB connection.
 */
export function verifySqliteConnection(db: SqliteDatabase): number {
  const row = queryOne<{ value: number }>(db, "SELECT 1 AS value");
  return row?.value ?? 0;
}
