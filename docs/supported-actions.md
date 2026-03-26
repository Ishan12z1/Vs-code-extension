# Supported Actions

## Purpose

This document defines what VS Code Control Agent supports in v1.

The product is broad in terms of VS Code ecosystem understanding, but bounded in what it can actually change.

If a behavior is not listed here, it should be treated as unsupported.

## V1 product scope

V1 supports five classes of user-facing capability:

- explain VS Code
- inspect VS Code state
- configure VS Code
- repair VS Code workflows
- guide VS Code decisions

These capabilities are limited to VS Code-native surfaces and selected extension-aware workflows.

## 1. Explain

The assistant can explain how VS Code behavior works in the current context.

Supported explanation topics include:

- user vs workspace settings
- why a setting is taking effect
- how formatting is currently configured
- which formatter or linter appears to be active
- how a debug configuration is structured
- how a task is wired
- how selected keybindings behave
- how supported extensions fit into the current workspace
- why a workspace may not be behaving as expected

Explanation-only responses do not require approval.

## 2. Inspect

The assistant can inspect bounded local context needed to answer VS Code-specific questions.

Supported inspection targets include:

- user settings
- workspace settings
- `.vscode/settings.json`
- `.vscode/tasks.json`
- `.vscode/launch.json`
- `.vscode/extensions.json`
- selected keybinding state
- selected extension presence/state
- selected stack markers relevant to supported workflows

Supported stack markers include:

- `package.json`
- `tsconfig.json`
- `pyproject.toml`
- `requirements.txt`

Inspection-only flows do not require approval.

## 3. Configure

The assistant can propose and apply bounded changes to supported VS Code surfaces.

### Supported configuration targets

- user settings
- workspace settings
- `.vscode/settings.json`
- `.vscode/tasks.json`
- `.vscode/launch.json`
- `.vscode/extensions.json`
- selected keybindings

### Example supported configuration actions

- enable or disable format on save
- set or change a formatter
- update selected linting-related settings
- create or patch a launch configuration
- create or patch a task configuration
- add or update extension recommendations
- add or update a selected keybinding entry
- align workspace settings with a supported workflow

All write actions require preview before apply.

## 4. Repair

The assistant can diagnose and help repair bounded VS Code-native workflow issues.

Supported repair categories include:

- format-on-save not working
- formatter conflicts
- linting integration issues
- missing or broken debug configuration
- missing or broken task configuration
- broken extension recommendation/setup alignment
- settings conflicts across scope
- selected keybinding issues

Repair flows may be:

- explanation-only
- recommendation-only
- or action-backed if the needed changes are supported

If a repair flow includes writes, preview and approval are required.

## 5. Guide

The assistant can recommend the right VS Code-native path for a task.

Supported guidance includes:

- whether something belongs in settings, tasks, or launch config
- which supported extension to use for a workflow
- whether a workflow should be user-level or workspace-level
- how to structure a selected VS Code setup cleanly
- how to resolve ambiguity between multiple VS Code-native mechanisms

Guidance-only flows do not require approval.

## Supported surfaces in v1

The assistant can operate on these surfaces in v1:

- user settings
- workspace settings
- `.vscode/settings.json`
- `.vscode/tasks.json`
- `.vscode/launch.json`
- `.vscode/extensions.json`
- selected keybindings
- selected extension recommendations and related supported settings

## Selected v1 integrations

The officially supported v1 integrations are:

- Python
- ESLint
- Prettier

The assistant may inspect and reason about adjacent VS Code behavior, but it must not claim full official support outside the selected list.

## Selected supported workflows

V1 supports bounded workflows such as:

### Python

- Python format-on-save setup
- Python formatter configuration
- Python linting starter setup
- Python debug starter setup

### JavaScript / TypeScript

- ESLint + Prettier setup
- JS/TS format-on-save setup
- JS/TS launch configuration starter
- selected task and debugging alignment

## Approval policy

### No approval required

- explain flows
- inspect flows
- guide flows
- planning and preview
- non-mutating recommendations

### Approval required

- any write to user settings
- any write to workspace settings
- any write to `.vscode/*`
- any keybinding write
- any repair flow that includes writes
- any configuration flow that changes local state

## Undo-supported actions

Every supported write action in v1 must support undo.

Undo-supported write categories are:

- user settings changes
- workspace settings changes
- `.vscode/settings.json`
- `.vscode/tasks.json`
- `.vscode/launch.json`
- `.vscode/extensions.json`
- selected keybinding changes

If rollback is not implemented, the action must not be treated as supported.

## Explicitly unsupported actions

The following are out of scope in v1:

- arbitrary shell execution
- terminal command execution generated by the planner
- broad machine automation
- hidden side effects
- arbitrary repo-wide source editing as a primary feature
- implementing product features in user codebases
- universal support for every VS Code extension
- unsupported extension internals
- full multi-agent orchestration as the main product
- pretending to understand everything in the VS Code ecosystem equally well

## Reduction rule

If a user request is broader than the supported write surface, the assistant should try to reduce it into a supported VS Code-native subset.

If that is not possible, it should refuse clearly.

## Interpretation rule

This product is intentionally broad in conversation scope but bounded in execution scope.

It can talk about many VS Code issues.
It can only execute within supported VS Code-native surfaces.