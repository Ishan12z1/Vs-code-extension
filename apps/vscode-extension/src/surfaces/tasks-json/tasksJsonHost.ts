import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Minimal host abstraction for .vscode/tasks.json access.
 *
 * Why this exists:
 * - the adapter should be testable without real filesystem or VS Code plumbing
 * - file location concerns should not be mixed into adapter logic
 */
export interface TasksJsonHost {
  /**
   * Read the raw tasks.json text.
   *
   * Returns null when the file does not exist yet.
   */
  readText(): Promise<string | null>;

  /**
   * Persist the full tasks.json text.
   */
  writeText(text: string): Promise<void>;

  /**
   * Delete the tasks.json file.
   *
   * This is useful when rollback restores a prior "no file" state.
   */
  deleteFile(): Promise<void>;

  /**
   * Human-readable target label used in previews/logs.
   */
  getTargetLabel(): string;
}

/**
 * Simple file-backed host implementation.
 *
 * Important:
 * - this class does not try to discover the correct tasks.json location
 * - it only reads/writes the path supplied by the caller
 */
export class FileTasksJsonHost implements TasksJsonHost {
  public constructor(private readonly filePath: string) {}

  public async readText(): Promise<string | null> {
    try {
      return await fs.readFile(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  public async writeText(text: string): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, text, "utf8");
  }

  public async deleteFile(): Promise<void> {
    try {
      await fs.unlink(this.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }

      throw error;
    }
  }

  public getTargetLabel(): string {
    return this.filePath;
  }
}
