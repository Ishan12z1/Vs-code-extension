# Legacy API Path

## Status

This folder is legacy / experimental.

It is **not** part of the primary V1 execution path for VS Code Control Agent.

## Why this is legacy

The project has moved to a local-first V1 architecture:

- desktop-only VS Code extension
- TypeScript-first runtime
- no hosted backend required for normal V1 execution
- bounded tool-based execution inside the extension runtime

This `apps/api` folder belongs to the older backend-first / plan-first architecture.

## What lives here today

This folder still contains the older hosted API path, including routes and supporting backend code for:

- planner execution
- health/version endpoints
- workspace snapshot acceptance
- DB-related backend checks

That code may remain temporarily during migration, but it is not the center of the product anymore.

## Rules

### 1. No new runtime dependencies

No new V1 runtime code may import from `apps/api`.

That includes:

- extension runtime modules
- new services
- new agent modules
- new tool registry code
- new surface adapter code
- new persistence code

### 2. No feature expansion here for V1

Do not add new V1 product features here.

If a feature is part of the local-first V1 runtime, it belongs in:

- `apps/vscode-extension`
- `packages/contracts`

not in `apps/api`.

### 3. Legacy path only

This folder may be kept temporarily for:

- migration reference
- experimental backend work
- historical comparison
- transitional testing

It should not be treated as the default developer path.

## Migration intent

The intended V1 architecture is:

`UI -> command/controller -> run service -> agent runtime -> policy check -> tool registry -> surface adapter -> persistence -> UI update`

The extension runtime is the main product path.

## Follow-up

Later phases may either:

- rename this folder to `apps/api-legacy`
- archive it
- remove it from the primary README/dev flow entirely

Until then, this file exists to make the boundary explicit.
