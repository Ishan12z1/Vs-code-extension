const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();

const requiredFiles = [
  "docs/architecture/overview.md",
  "docs/scope/v1-scope.md",
  "docs/architecture/dependency-rules.md",
  "docs/adr/001-local-first-v1.md",
  "apps/api/LEGACY.md",
  "README.md",
];

const requiredDirectories = [
  "apps/vscode-extension",
  "packages/contracts",
  "apps/mcp-recipes",
  "scripts",
];

const warnings = [];
const errors = [];

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

for (const filePath of requiredFiles) {
  if (!exists(filePath)) {
    errors.push(`Missing required file: ${filePath}`);
  }
}

for (const dirPath of requiredDirectories) {
  if (!exists(dirPath)) {
    errors.push(`Missing required directory: ${dirPath}`);
  }
}

if (exists("apps/api") && !exists("apps/api-legacy")) {
  warnings.push(
    "Legacy API folder is still named apps/api. This is allowed for now, but it must be clearly marked legacy."
  );
}

if (exists("apps/api-legacy") && !exists("apps/api-legacy/LEGACY.md")) {
  errors.push(
    "apps/api exists but is not clearly marked legacy. Add apps/api/LEGACY.md."
  );
}

if (!exists("package.json")) {
  errors.push("Missing root package.json");
}

if (warnings.length > 0) {
  console.warn("verifyRepoShape warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.error("verifyRepoShape failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("verifyRepoShape passed.");