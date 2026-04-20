const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();

const codeFileExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function walk(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "dist-tests" ||
        entry.name === ".git"
      ) {
        continue;
      }

      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && codeFileExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractImports(sourceText) {
  const matches = [
    ...sourceText.matchAll(
      /import\s+(?:type\s+)?(?:[^"'`]+\s+from\s+)?["'`]([^"'`]+)["'`]/g
    ),
    ...sourceText.matchAll(/export\s+[^"'`]*from\s+["'`]([^"'`]+)["'`]/g),
    ...sourceText.matchAll(/require\(\s*["'`]([^"'`]+)["'`]\s*\)/g),
  ];

  return matches.map((match) => match[1]).filter(Boolean);
}

function isInside(filePath, segment) {
  return toPosix(filePath).includes(segment);
}

const rules = [
  {
    name: "ui-to-surfaces",
    appliesTo: (filePath) =>
      isInside(filePath, "/apps/vscode-extension/src/ui/"),
    violates: (importPath) =>
      importPath.includes("/surfaces/") ||
      importPath.startsWith("../surfaces") ||
      importPath.startsWith("../../surfaces"),
    message: "UI must not import surfaces directly.",
  },
  {
    name: "ui-to-persistence",
    appliesTo: (filePath) =>
      isInside(filePath, "/apps/vscode-extension/src/ui/"),
    violates: (importPath) =>
      importPath.includes("/persistence/") ||
      importPath.startsWith("../persistence") ||
      importPath.startsWith("../../persistence"),
    message: "UI must not import persistence directly.",
  },
  {
    name: "surfaces-to-ui",
    appliesTo: (filePath) =>
      isInside(filePath, "/apps/vscode-extension/src/surfaces/"),
    violates: (importPath) =>
      importPath.includes("/ui/") ||
      importPath.startsWith("../ui") ||
      importPath.startsWith("../../ui"),
    message: "Surfaces must not import UI.",
  },
  {
    name: "surfaces-to-agent",
    appliesTo: (filePath) =>
      isInside(filePath, "/apps/vscode-extension/src/surfaces/"),
    violates: (importPath) =>
      importPath.includes("/agent/") ||
      importPath.startsWith("../agent") ||
      importPath.startsWith("../../agent"),
    message: "Surfaces must not import agent modules.",
  },
  {
    name: "policy-to-ui",
    appliesTo: (filePath) =>
      isInside(filePath, "/apps/vscode-extension/src/policy/"),
    violates: (importPath) =>
      importPath.includes("/ui/") ||
      importPath.startsWith("../ui") ||
      importPath.startsWith("../../ui"),
    message: "Policy must not import UI.",
  },
  {
    name: "tools-to-webview",
    appliesTo: (filePath) =>
      isInside(filePath, "/apps/vscode-extension/src/tools/"),
    violates: (importPath) =>
      importPath.includes("/webview/") || importPath.includes("webview"),
    message: "Tools must not import webview code.",
  },
  {
    name: "contracts-to-vscode",
    appliesTo: (filePath) => isInside(filePath, "/packages/contracts/"),
    violates: (importPath) => importPath === "vscode",
    message: "Contracts must not import VS Code APIs.",
  },
  {
    name: "contracts-to-sqlite",
    appliesTo: (filePath) => isInside(filePath, "/packages/contracts/"),
    violates: (importPath) =>
      importPath.includes("sqlite") ||
      importPath.includes("better-sqlite") ||
      importPath.includes("sql.js"),
    message: "Contracts must not import SQLite or persistence libraries.",
  },
{
  name: "new-runtime-to-legacy-api",
  appliesTo: (filePath) => {
    const normalized = toPosix(filePath);

    return (
      normalized.includes("/apps/vscode-extension/src/bootstrap/") ||
      normalized.includes("/apps/vscode-extension/src/services/") ||
      normalized.includes("/apps/vscode-extension/src/agent/") ||
      normalized.includes("/apps/vscode-extension/src/policy/") ||
      normalized.includes("/apps/vscode-extension/src/tools/") ||
      normalized.includes("/apps/vscode-extension/src/surfaces/") ||
      normalized.includes("/apps/vscode-extension/src/persistence/") ||
      normalized.includes("/apps/vscode-extension/src/rollback/") ||
      normalized.includes("/apps/vscode-extension/src/marketplace/")
    );
  },
  violates: (importPath) =>
    importPath.includes("apps/api") ||
    importPath.includes("api-legacy"),
  message:
    "New runtime modules must not import legacy backend code.",
},
];

const filesToScan = [
  ...walk(path.join(repoRoot, "apps")),
  ...walk(path.join(repoRoot, "packages")),
  ...walk(path.join(repoRoot, "scripts")),
];

const violations = [];

for (const absoluteFilePath of filesToScan) {
  const relativeFilePath = toPosix(path.relative(repoRoot, absoluteFilePath));
  const sourceText = fs.readFileSync(absoluteFilePath, "utf8");
  const imports = extractImports(sourceText);

  for (const rule of rules) {
    if (!rule.appliesTo(absoluteFilePath)) {
      continue;
    }

    for (const importPath of imports) {
      if (rule.violates(importPath)) {
        violations.push(
          `${relativeFilePath}: ${rule.message} Offending import: "${importPath}"`
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error("verifyNoForbiddenImports failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("verifyNoForbiddenImports passed.");