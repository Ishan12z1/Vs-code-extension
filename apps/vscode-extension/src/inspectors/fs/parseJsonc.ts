import { parse, ParseError, printParseErrorCode } from "jsonc-parser";

/**
 * Normalized parse result for JSONC files
 */

export interface JsoncParseResult {
  ok: boolean;
  value: unknown | null;
  error: string | null;
}

/**
 * Parses JSONC safely.
 *
 * This supports comments and trailing commas, which are both common
 * in VS Code-managed JSON files.
 */
export function parseJsonc(text: string): JsoncParseResult {
  const errors: ParseError[] = [];
  const value = parse(text, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  });

  if (errors.length > 0) {
    const firstError = errors[0];
    return {
      ok: false,
      value: null,
      error: `JSONC parse error: ${printParseErrorCode(firstError.error)} at offset ${firstError.offset}`,
    };
  }
  return {
    ok: true,
    value,
    error: null,
  };
}
