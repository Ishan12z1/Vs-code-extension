// list of VS Code settings your inspector can read
export const RELEVANT_SETTING_KEYS: readonly string[] = [
  "editor.formatOnSave",
  "editor.defaultFormatter",
  "editor.codeActionsOnSave",
  "files.autoSave",
  "[python]",
  "[javascript]",
  "[typescript]",
  "eslint.enable",
  "eslint.validate",
  "prettier.enable",
  "prettier.requireConfig",
];

// list of VS Code extensions your inspector can read
export const TARGET_EXTENSION_IDS: readonly string[] = [
  "ms-python.python",
  "ms-python.debugpy",
  "dbaeumer.vscode-eslint",
  "esbenp.prettier-vscode",
];

//commands you want to check for availability

export const RELEVANT_COMMANDS: ReadonlyArray<{
  command: string;
  note: string;
}> = [
  {
    command: "editor.action.formatDocument",
    note: "Formatting command should exist if formatting flows are inspectable.",
  },
  {
    command: "editor.action.codeAction",
    note: "Code action command is relevant to on-save fix flows.",
  },
  {
    command: "workbench.action.tasks.runTask",
    note: "Task execution command is relevant to task/debug diagnosis.",
  },
  {
    command: "workbench.action.debug.start",
    note: "Debug start command is relevant to launch/debug diagnosis.",
  },
];
