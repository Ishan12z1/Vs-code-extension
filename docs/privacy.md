# Privacy

## Purpose

This document explains what VS Code Control Agent may read, what may be sent to the backend, what stays local, and what users should expect in v1.

The product should be transparent about planning and execution boundaries.

## Privacy goals

The privacy model in v1 should be:

- explicit
- bounded
- minimal
- understandable
- consistent with the product architecture

## Core privacy principle

The assistant may use backend planning, but local VS Code changes are executed by the extension.

This means some bounded context may leave the machine for planning, while local mutation remains local.

## What the extension may read locally

The extension may read only the context needed for supported VS Code tasks, including:

- the user’s request
- workspace metadata
- relevant user settings
- relevant workspace settings
- supported `.vscode/*`
- selected keybinding state where relevant
- selected extension presence/state
- selected stack markers needed for supported workflows

Examples of selected stack markers include:

- `package.json`
- `tsconfig.json`
- `pyproject.toml`
- `requirements.txt`

The extension should avoid broad repo ingestion unless it is directly relevant to a supported VS Code-native task.

## What may be sent to the backend

The backend may receive bounded planning context such as:

- the user’s request
- summarized local configuration state
- relevant VS Code state needed to answer or plan
- structured metadata for explanation, diagnosis, or action planning
- trace metadata
- recipe/integration lookup context

The product should minimize unnecessary raw content transmission.

## What should stay local

The following should remain local wherever possible:

- local execution
- apply operations
- undo operations
- local rollback snapshots
- local editor UI state
- raw secrets and tokens
- irrelevant workspace content

## Explain-first privacy advantage

Because the product supports explain, inspect, repair, and guide flows, not every interaction should require mutation and not every interaction should require broad context.

The system should prefer:

- explanation over mutation when possible
- bounded inspection over broad ingestion
- targeted context over whole-workspace collection

## Secret handling

The product should not intentionally collect or transmit secrets unrelated to its supported workflows.

The extension should avoid reading or sending:

- credential files unrelated to the current VS Code task
- tokens not needed for product operation
- unrelated environment secrets

If a future feature would require handling secret-like data, that should be designed explicitly and documented clearly.

## Logging and tracing

The system may store operational metadata such as:

- run IDs
- request class
- plan status
- action status
- risk metadata
- failure state
- timing and trace metadata

Logs and traces should not become a mechanism for broad content capture.

The system should favor metadata over unnecessary raw workspace retention.

## Transparency expectations

Users should be able to understand:

- what the assistant inspected
- what context was used for planning
- what is being explained, recommended, or changed
- what approval covers
- what undo can revert

The product should not rely on ambiguity to appear more private than it is.

## What the product should not claim

The product should not claim:

- that all reasoning happens locally
- that no workspace information ever leaves the machine
- that it has zero backend visibility when backend planning is used

Instead, it should state plainly:

- bounded VS Code-relevant context may be sent to the backend
- local changes are executed in the extension
- supported writes are previewable and undoable

## Data minimization rules

The privacy model in v1 follows these rules:

1. Read only what is needed for the current supported task.
2. Prefer targeted VS Code context over broad project ingestion.
3. Send only what is needed for explanation, diagnosis, or planning.
4. Keep local mutation and rollback local.
5. Avoid hidden collection behavior.
6. Document any future expansion in data access before normalizing it.

## User expectations

Users should expect the assistant to be able to:

- inspect VS Code-relevant local state
- explain current VS Code behavior
- diagnose selected VS Code workflow issues
- plan bounded local changes
- apply supported changes locally after approval

Users should not have to guess which parts of the system were local and which were backend-assisted.

## Privacy summary

In v1:

- the product is broad in VS Code understanding
- bounded context may be used for backend planning
- local VS Code changes are applied by the extension
- the product should minimize unnecessary data movement
- privacy communication should be concrete and accurate