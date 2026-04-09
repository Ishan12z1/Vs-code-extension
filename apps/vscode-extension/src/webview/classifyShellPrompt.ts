export type ShellPromptRoute =
  | "explain"
  | "configure"
  | "repair"
  | "guide"
  | "general";

export interface ShellPromptClassification {
  readonly route: ShellPromptRoute;
  readonly label: string;
  readonly nextStep: string;
}

function includesAny(
  normalized: string,
  candidates: readonly string[]
): boolean {
  return candidates.some((candidate) => normalized.includes(candidate));
}

export function classifyShellPrompt(prompt: string): ShellPromptClassification {
  const normalized = prompt.trim().toLowerCase();

  if (
    includesAny(normalized, [
      "explain",
      "inspect",
      "why",
      "current vscode setup",
      "current setup",
      "show my setup",
    ])
  ) {
    return {
      route: "explain",
      label: "Explain / inspect",
      nextStep: "Run the read-only workspace explanation flow in the sidebar.",
    };
  }

  if (
    includesAny(normalized, [
      "fix",
      "repair",
      "broken",
      "not working",
      "debug",
      "diagnose",
    ])
  ) {
    return {
      route: "repair",
      label: "Repair / diagnose",
      nextStep:
        "Capture the request in the shell now; later steps will connect planner and execution support.",
    };
  }

  if (
    includesAny(normalized, [
      "set ",
      "configure",
      "enable",
      "disable",
      "change",
      "update",
      "turn on",
      "turn off",
    ])
  ) {
    return {
      route: "configure",
      label: "Configure",
      nextStep:
        "Capture the requested change now; preview/apply/approval belong to later steps.",
    };
  }

  if (
    includesAny(normalized, [
      "how do i",
      "how to",
      "should i",
      "where should",
      "what should",
      "recommend",
      "guide",
    ])
  ) {
    return {
      route: "guide",
      label: "Guide",
      nextStep:
        "Show request capture in the shell now; richer guidance and planning arrive later.",
    };
  }

  return {
    route: "general",
    label: "General request",
    nextStep:
      "Keep the shell responsive and capture the request honestly until the backend planner is wired.",
  };
}

export function isExplainLikePrompt(prompt: string): boolean {
  return classifyShellPrompt(prompt).route === "explain";
}
