# VS Code Control Agent — Architecture Overview

## V1 product shape

VS Code Control Agent is a desktop-only, TypeScript-first, local-first VS Code extension.

V1 uses:

- one bounded autonomous agent
- a cloud model API
- risk-based approvals
- modular VS Code surface adapters
- local persistence, rollback, and history

V1 does **not** depend on a hosted backend for normal execution.

## Core runtime flow

The fixed V1 flow is:

`UI -> command/controller -> run service -> agent runtime -> policy check -> tool registry -> surface adapter -> persistence -> UI update`

This flow is the architectural spine of the project and should not drift.

## Main repo roles

### `apps/vscode-extension`

This is the main V1 product runtime.

It owns:

- commands
- sidebar/webview UI
- tool registry
- agent loop
- approval flow
- rollback and snapshots
- local persistence integration
- run history and trace display

### `packages/contracts`

This is the single source of truth for typed boundaries and shared schemas.

Its center must move from plan-first contracts to runtime-first contracts.

### `apps/api`

This folder is legacy / experimental and is not part of the V1 execution path.

It may remain in the repository temporarily, but new V1 runtime code must not depend on it.

### `apps/mcp-recipes`

This workspace remains optional and future-facing.

It is not required for the V1 control path.

## V1 architectural rules

- all writes must go through surface adapters
- UI must not write editor state directly
- agent runtime must not patch files directly
- contracts must not import VS Code APIs
- legacy planner/backend code must not be imported into the new runtime path

## High-level module boundaries

### UI layer

The UI layer renders views, sends events, receives run state updates, and shows approvals, progress, history, and summaries.

It must not:

- modify files directly
- write VS Code configuration directly
- decide approval policy
- talk to persistence directly

### Commands layer

Commands are thin entry points.

They may:

- open UI
- call services
- trigger runs

They must not:

- contain agent logic
- contain business logic
- patch files directly

### Agent layer

The agent layer owns bounded orchestration.

It may:

- assemble context
- choose the next tool
- manage run state
- stop, retry, pause, resume

It must not:

- mutate VS Code surfaces directly
- bypass the tool registry
- own storage implementation details

### Tools layer

The tools layer exposes typed operations to the agent.

It may:

- register tools
- validate tool inputs
- route execution to adapters or services

It must not:

- own UI logic
- own policy decisions
- store history directly

### Surfaces layer

The surfaces layer owns actual VS Code inspection and mutation behavior.

Each supported surface should implement:

- inspect
- preview
- apply
- verify
- rollback

It must not:

- decide agent flow
- decide approval rules
- call model APIs

### Persistence layer

The persistence layer owns local state only.

It may:

- persist runs
- store approvals
- store checkpoints
- store snapshots
- store history

It must not:

- decide runtime flow
- apply editor mutations
