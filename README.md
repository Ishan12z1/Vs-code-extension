# VS Code Control Agent

VS Code Control Agent is a desktop-only, TypeScript-first, local-first VS Code extension for safely configuring, repairing, and managing the VS Code environment.

It turns a natural-language goal into a bounded sequence of VS Code-specific actions, executes those actions step by step, verifies outcomes, pauses for approval on medium/high-risk changes, and supports rollback.

## Current status

This repository is in migration from an older backend-first / plan-first architecture to a local-first / runtime-first architecture.

The target V1 architecture is:

`UI -> command/controller -> run service -> agent runtime -> policy check -> tool registry -> surface adapter -> persistence -> UI update`

That runtime flow is the main product direction for V1.

## V1 principles

- local-first
- controlled autonomy
- native VS Code operations
- safe by default
- modular surface adapters
- local persistence, history, and rollback

## V1 scope

### In scope

- user settings
- workspace settings
- keybindings
- extension lifecycle
  - install
  - update
  - enable
  - disable
  - uninstall
- `.vscode/tasks.json`
- `.vscode/launch.json`
- marketplace metadata fetch
- local run history
- local rollback and snapshots
- approval flow for medium/high-risk writes
- desktop VS Code only

### Out of scope

- hosted backend as a required execution path
- Postgres in the normal V1 path
- Python sidecar as a required execution component
- arbitrary shell execution
- project code editing as a core feature
- browser automation
- web extension support
- remote-first / Codespaces-first support
- multi-agent V1
- enterprise sync / shared cloud state

## Repository layout

### `apps/vscode-extension`

This is the main V1 product runtime.

It is the place for:

- commands
- sidebar/webview UI
- local agent runtime
- tool registry
- policy enforcement
- surface adapters
- rollback and snapshots
- local persistence integration
- history and summaries

### `packages/contracts`

This package is the shared typed boundary layer.

It is being migrated from a plan-first contract model to a runtime-first contract model.

### `apps/api`

This folder is legacy / experimental.

It is not part of the primary V1 execution path and should not be treated as the default product runtime.

### `apps/mcp-recipes`

This workspace is optional and future-facing.

It may be used as a recipe or knowledge module later, but it is not required for the core V1 control path.

## Legacy and deprecated paths

The repository still contains older backend-first elements during migration.

These should be treated as legacy:

- hosted API execution path
- planner-first backend flow
- Postgres / Docker DB workflow as a normal default
- extension assumptions that depend on a hosted backend

### Deprecated in the new V1 path

The following belong to the older architecture and should be treated as deprecated in the main V1 story:

- `apps/api` as the core execution path
- backend URL driven execution flow
- Postgres-backed normal development workflow
- backend planner routes as the primary runtime model

## Architecture rules

- all writes must go through surface adapters
- UI must not mutate editor state directly
- commands must stay thin
- the agent must not patch files directly
- tools must be typed and bounded
- contracts must not import VS Code APIs
- new runtime code must not import legacy backend/planner code

## Development note

During migration, some legacy code and scripts may still exist in the repository.

That does **not** mean they are the preferred V1 path.

The intended V1 direction is:

- extension-first runtime
- local persistence
- bounded tool execution
- approval-gated medium/high-risk writes
- rollback and history inside the extension path

## Phase 0 purpose

Phase 0 exists to lock the repo shape and stop architectural drift before deeper implementation work begins.

Phase 0 focuses on:

- architecture docs
- scope docs
- dependency rules
- ADRs
- legacy marking
- repo verification scripts
- README reset

## Near-term migration path

The next major migration steps after phase 0 are:

1. refactor contracts from plan-first to runtime-first
2. create the local runtime skeleton inside the extension
3. add local persistence
4. implement surface adapters
5. add the bounded tool registry and policy engine
6. integrate approvals, rollback, history, and UI state

## Summary

VS Code Control Agent is moving toward:

- one extension app
- one local runtime
- one tool registry
- one policy layer
- one persistence layer
- many surface adapters

That is the structure V1 is being built around.
