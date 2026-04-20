# Dependency Rules

These rules exist to stop architectural drift.

## Allowed dependency direction

The intended dependency direction is:

`ui/commands -> services -> agent -> policy/tools -> surfaces -> persistence`

The agent may also depend on:

`agent -> marketplace`

## Forbidden dependency direction

The following directions are forbidden:

- `ui -> surfaces`
- `ui -> persistence`
- `surfaces -> ui`
- `surfaces -> agent`
- `policy -> ui`
- `contracts -> vscode`
- `contracts -> sqlite`
- `marketplace -> ui`
- `tools -> webview`

## Hard rule

All writes must go through a surface adapter.

No exceptions.

That means:

- no direct file patching in the agent runtime
- no direct config writes in the UI layer
- no direct JSON patching in command handlers

## Layer responsibilities

### UI

UI may:

- render views
- send commands/events
- receive run state updates
- present approvals, summaries, and history

UI may not:

- write VS Code state directly
- call persistence directly
- decide policy

### Commands

Commands may:

- trigger services
- open views
- start or resume runs

Commands may not:

- own business logic
- own agent logic
- mutate surfaces directly

### Services

Services coordinate application use-cases and route requests into the runtime, persistence, and UI-facing state.

Services should stay thin and explicit.

### Agent

The agent may:

- assemble context
- choose tools
- manage run state
- stop/retry/pause/resume

The agent may not:

- patch files directly
- bypass tools
- own persistence implementation details

### Tools

Tools may:

- define typed operations
- validate inputs
- call adapters and services

Tools may not:

- own UI
- own policy decisions
- store history directly

### Surfaces

Surfaces may:

- inspect
- preview
- apply
- verify
- rollback

Surfaces may not:

- choose agent flow
- choose approval timing
- call model APIs

### Policy

Policy may:

- classify risk
- decide approval requirement
- block forbidden actions

Policy may not:

- mutate editor state
- call model APIs
- depend on UI

### Persistence

Persistence may:

- store runs
- store approvals
- store checkpoints
- store snapshots
- store history

Persistence may not:

- decide runtime flow
- apply VS Code mutations

## Legacy boundary rule

No new runtime module may import from legacy planner/backend code.

That includes:

- imports from `apps/api`
- imports from backend-first planner paths
- new runtime code depending on hosted-backend execution assumptions

## Contracts boundary rule

`packages/contracts` is the typed boundary layer.

It may:

- define schemas
- define shared types

It may not:

- contain business logic
- import VS Code APIs
- import SQLite or persistence libraries

## Enforcement guidance

Architectural rule violations should be caught by repo verification scripts.

At minimum, the repository should fail validation when it detects:

- forbidden imports across layers
- new runtime code depending on legacy backend modules
- contracts importing runtime-specific dependencies
