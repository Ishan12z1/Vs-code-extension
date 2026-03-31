/**
 * Marker files definitions
 */

export interface StackMarkerDefinition {
  /**
   * Stable internal id used during inference.
   */
  id: string;

  /**
   * Root-level glob/pattern searched inside each workspace folder.
   */
  pattern: string;

  /**
   * Marker tag written into WorkspaceSnapshot.detectedMarkers
   * when at least one matching file exists.
   */
  detectedMarker: string;
}

/**
 * These are the exact marker families called out in the plan.
 */
export const STACK_MARKER_DEFINITIONS: readonly StackMarkerDefinition[] = [
  {
    id: "packageJson",
    pattern: "package.json",
    detectedMarker: "marker:package.json",
  },
  {
    id: "tsconfigJson",
    pattern: "tsconfig.json",
    detectedMarker: "marker:tsconfig.json",
  },
  {
    id: "pyprojectToml",
    pattern: "pyproject.toml",
    detectedMarker: "marker:pyproject.toml",
  },
  {
    id: "requirementsTxt",
    pattern: "requirements.txt",
    detectedMarker: "marker:requirements.txt",
  },
  {
    id: "eslintConfig",
    pattern: ".eslintrc*",
    detectedMarker: "marker:.eslintrc",
  },
  {
    id: "prettierConfig",
    pattern: ".prettierrc*",
    detectedMarker: "marker:.prettierrc",
  },
];

/**
 * Converts raw found marker ids into conservative inferred signals.
 *
 * Important :
 * - package.json alone is only a weak JS/TS signal
 * - tsconfig / eslint / prettier are stronger JS/TS signals
 * - pyproject / requirements are strong Python signals
 */

export function inferStackSignals(foundMarkerIds: ReadonlySet<string>): {
  detectedMarkers: string[];
  notes: string[];
} {
  const detectedMarkers: string[] = [];
  const notes: string[] = [];

  const hasPackageJson = foundMarkerIds.has("packageJson");
  const hasTsconfig = foundMarkerIds.has("tsconfig");
  const hasPyproject = foundMarkerIds.has("pyprojectToml");
  const hasRequirements = foundMarkerIds.has("requirementsTxt");
  const hasEslint = foundMarkerIds.has("eslintConfig");
  const hasPrettier = foundMarkerIds.has("prettierConfig");

  /**
   * Python inference.
   */
  if (hasPyproject || hasRequirements) {
    detectedMarkers.push("stack:python");
    notes.push(
      "Detected likely Python workspace signals from pyproject.toml and/or requirements.txt."
    );
  }

  /**
   * JS/TS inference.
   *
   * We treat tsconfig / eslint / prettier as stronger evidence.
   * package.json alone is kept as a weaker note.
   */
  if (hasTsconfig || hasEslint || hasPrettier) {
    detectedMarkers.push("stack:jsts");
    notes.push(
      "Detected likely JS/TS workspace signals from tsconfig.json and/or ESLint/Prettier config."
    );
  } else if (hasPackageJson) {
    detectedMarkers.push("stack:jsts:weak");
    notes.push(
      "Detected package.json, which is a weak JS/TS signal without tsconfig or lint/format config."
    );
  }

  /**
   * Tool-specific signals.
   */
  if (hasEslint) {
    detectedMarkers.push("tool:eslint");
  }

  if (hasPrettier) {
    detectedMarkers.push("tool:prettier");
  }

  return {
    detectedMarkers,
    notes,
  };
}
