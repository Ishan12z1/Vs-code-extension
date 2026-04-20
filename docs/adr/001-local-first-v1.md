# ADR 001: Local-First V1

- Status: Accepted
- Date: 2026-04-20

## Context

The repository currently contains a backend-first, plan-first path centered around hosted execution, planner routes, and supporting API infrastructure.

The updated product direction changes the system center.

V1 is a desktop-only VS Code extension with a TypeScript-first runtime, bounded autonomous behavior, local persistence, rollback/history support, and a cloud model API.

The extension itself becomes the real product runtime.

## Decision

V1 will be local-first.

This means:

- the primary runtime lives inside `apps/vscode-extension`
- normal V1 execution must not depend on a hosted backend
- the system center moves from plan-first orchestration to runtime-first tool execution
- all writes must go through surface adapters
- approvals, checkpoints, rollback, and run history are owned by the local runtime path

## Consequences

### Positive consequences

- fewer moving parts in V1
- clearer product boundary
- better alignment with desktop-only VS Code workflows
- safer bounded execution path
- easier local history, rollback, and approval handling
- cleaner long-term architecture for modular surfaces

### Negative consequences

- existing backend-first code becomes legacy
- some current extension flows remain transitional until later phases complete
- contracts must be refactored from plan-first to runtime-first
- root scripts and docs must stop presenting the backend as the default path

## Repo implications

### `apps/vscode-extension`

This becomes the main V1 product runtime.

### `packages/contracts`

This must become runtime-first over time, while preserving legacy plan-first contracts temporarily during migration.

### `apps/api`

This is legacy / experimental and not part of the V1 core execution path.

### `apps/mcp-recipes`

This remains optional and future-facing, not required for the V1 control path.

## Migration implications

During migration:

- legacy backend code may remain in the repo temporarily
- default developer flow should stop advertising the backend as the primary path
- backend URL assumptions should be deprecated from the main V1 story
- no new runtime code should depend on legacy backend modules

## Rejected alternative

### Keep hosted backend as the normal V1 execution path

This was rejected because it conflicts with the updated product definition:

- local-first
- desktop-only
- bounded tool-based execution
- no hosted backend in V1

## Follow-up work

This ADR requires:

- architecture docs that reflect the new local-first path
- dependency rules that block drift
- repo scripts that verify shape and forbidden imports
- legacy marking for backend-first code
- later contract and runtime refactors to complete the migration
