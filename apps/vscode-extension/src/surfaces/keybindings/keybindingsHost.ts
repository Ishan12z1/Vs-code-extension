import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * One normalized keybinding entry.
 *
 * This is the runtime-facing shape we use inside the adapter.
 * It matches the common structure of entries in keybindings.json.
 */
export interface KeybindingEntry {
  readonly key: string;
  readonly command: string;
  readonly when?: string;
  readonly args?: unknown;
}

/**
 * Minimal host abstraction for keybindings file access.
 *
 * Why this exists:
 * - the adapter should be testable without real VS Code file access
 * - the real runtime path to keybindings.json is the part that is messy
 * - separating file I/O from adapter logic keeps the design honest
 */
export interface KeybindingsHost {
  /**
   * Read the raw keybindings file text.
   *
   * Returns null when the file does not exist yet.
   */
  readText(): Promise<string | null>;

  /**
   * Persist the full keybindings file text.
   */
  writeText(text: string): Promise<void>;

  /**
   * Delete the keybindings file.
   *
   * This is useful for rollback when the previous state was "no file".
   */
  deleteFile(): Promise<void>;

  /**
   * Human-readable target label for logs/previews.
   */
  getTargetLabel(): string;
}

/**
 * Simple file-backed host implementation.
 *
 * Important:
 * - this class does not try to discover the real VS Code keybindings.json path
 * - it only reads/writes a path supplied by the caller
 * - that keeps the adapter core usable and testable today
 */
export class FileKeybindingsHost implements KeybindingsHost {
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
