# V1 Scope

## Product definition

VS Code Control Agent is a controlled autonomous VS Code operations agent that lives inside VS Code and helps users configure, repair, and manage their VS Code environment.

The V1 goal is not to generate a static plan.
The V1 goal is to complete bounded VS Code configuration tasks safely.

## In scope

V1 includes support for these surfaces and capabilities:

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

## Out of scope

The following are explicitly out of scope for V1:

- hosted backend as a required execution path
- Postgres in the normal V1 path
- Python sidecar as a required execution component
- arbitrary shell execution
- project code editing as a core feature
- browser automation
- web extension support
- remote-first / Codespaces-first support
- multi-agent V1
- enterprise sync or shared cloud state

## Product principles

### 1. Local-first

The agent runs inside the extension runtime and stores operational state locally.

### 2. Controlled autonomy

The agent is autonomous only inside a bounded tool and policy environment.

### 3. Native VS Code operations

The agent should prefer VS Code-native APIs and approved config surfaces instead of random filesystem hacking.

### 4. Safe by default

Medium/high-risk writes require approval.
All writes should be traceable and reversible.

### 5. Surface modularity

Each editable VS Code surface should be a module so support can be added or removed later without a rewrite.

## Supported V1 surfaces

The V1 writable surfaces are:

- user settings
- workspace settings
- keybindings
- extension lifecycle
- `.vscode/tasks.json`
- `.vscode/launch.json`

The V1 read-only/fetch support also includes:

- marketplace search and metadata lookup

## V1 safety model

### Auto-allowed

- inspection
- previews
- explanations
- marketplace fetch
- snapshot creation
- harmless reads

### Approval required

- workspace setting writes
- `tasks.json` writes
- `launch.json` writes
- keybinding changes with conflicts
- extension lifecycle actions that materially affect behavior
- overwriting user/global settings
- uninstalling extensions
- broad or destructive config rewrites

### Blocked in V1

- arbitrary shell commands
- arbitrary file writes outside approved surfaces
- system-level OS changes
- repo/codebase editing as part of normal operation

## Success criteria for V1

V1 is successful when the extension can safely complete bounded VS Code operations tasks by:

- inspecting the relevant surface state
- choosing the next allowed tool
- requesting approval when needed
- applying a bounded change
- verifying the result
- recording history and rollback state
- presenting a clear summary to the user
