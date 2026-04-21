import * as fs from "node:fs";
import * as path from "node:path";
import Database from "better-sqlite3";
import type { ExtensionRuntime } from "../../state/runtime";

/**
 * Small wrapper type for the concrete SQLite database instance.
 */
export type SqliteDatabase = Database.Database;

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
 * Ensure the migration bookkeeping table exists.
 *
 * Important:
 * - this is intentionally created by the runner itself
 * - we do not put it inside 001_init.sql because the runner needs it
 *   before normal migrations can be tracked safely
 */
function ensureMigrationTable(db: SqliteDatabase): void {
  db.exec(`
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
  const rows = db
    .prepare("SELECT id FROM _schema_migrations ORDER BY id ASC")
    .all() as Array<{ id: string }>;

  return new Set(rows.map((row) => row.id));
}

/**
 * Load migration files from disk in lexical order.
 *
 * Why lexical order:
 * - numbered files such as 001_, 002_, 003_ make ordering explicit
 * - it keeps migration execution deterministic
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
 * Each migration runs inside a transaction:
 * - the SQL executes
 * - the migration record is inserted
 * - either both happen or neither happens
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

    const applyOne = db.transaction(() => {
      db.exec(migration.sql);

      db.prepare(
        `
          INSERT INTO _schema_migrations (id, applied_at)
          VALUES (?, ?)
        `
      ).run(migration.id, new Date().toISOString());
    });

    applyOne();
  }
}

/**
 * Open the local SQLite database for the extension.
 *
 * Phase 3.2 change:
 * - opening the DB now also applies pending migrations
 */
export function openSqliteDatabase(runtime: ExtensionRuntime): SqliteDatabase {
  const paths = ensurePersistenceDirectory(runtime);

  runtime.output.appendLine(
    `[persistence] opening sqlite database at ${paths.databaseFile}`
  );

  const db = new Database(paths.databaseFile);

  /**
   * Enforce foreign key integrity once relational tables exist.
   */
  db.pragma("foreign_keys = ON");

  /**
   * WAL mode is a practical local default for durability and concurrency.
   */
  db.pragma("journal_mode = WAL");

  /**
   * Bring the DB schema up to date before returning the handle.
   */
  applySqliteMigrations(runtime, db);

  return db;
}

/**
 * Close the SQLite database safely.
 */
export function closeSqliteDatabase(
  runtime: ExtensionRuntime,
  db: SqliteDatabase
): void {
  runtime.output.appendLine("[persistence] closing sqlite database");
  db.close();
}

/**
 * Lightweight proof-of-life helper for the DB connection.
 */
export function verifySqliteConnection(db: SqliteDatabase): number {
  const row = db.prepare("SELECT 1 AS value").get() as { value: number };
  return row.value;
}
