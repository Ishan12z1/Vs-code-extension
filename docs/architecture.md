# Architecture

## Product summary

VS Code Control Agent is a VS Code-native chatbot for the VS Code ecosystem.

It understands VS Code concepts, surfaces, workflows, and extension-aware behaviors, and helps users inspect, explain, configure, repair, and automate VS Code-specific tasks through structured, previewable actions.

This product is not a general coding agent. It is not meant to compete on broad software implementation, arbitrary repo-wide editing, or command-line autonomy. Its job is to be the best assistant for understanding and operating VS Code itself.

## Product vision

The product exists to answer a simple question:

> What would an actually useful AI assistant look like if it were designed around VS Code as a product, instead of around generic coding tasks?

The answer is a chatbot that is specialized in:

- editor behavior
- workspace behavior
- settings scopes
- `.vscode/*`
- tasks
- debugging
- keybindings
- profiles
- extension-aware workflows
- VS Code-native setup and repair

## Product positioning

### What this is

This is:

- a generic chatbot for the VS Code ecosystem
- a VS Code-native assistant
- an editor and workspace control layer
- a structured planner and local executor for VS Code-specific actions
- a tool for understanding and managing how VS Code behaves

### What this is not

This is not:

- a general software engineering agent
- a repo-wide implementation bot
- a shell-first automation tool
- a replacement for broad coding agents
- a full autonomous development environment

## Why this is different from generic coding agents

Generic coding agents are centered on:

- reading files
- editing files
- running commands
- implementing features
- fixing code across a codebase

This product is centered on:

- understanding VS Code behavior
- explaining VS Code concepts in context
- configuring VS Code correctly
- repairing broken editor/workspace setups
- managing VS Code-specific surfaces through structured actions
- helping users choose the right VS Code-native mechanism for a task

The difference is not “AI in VS Code.”
The difference is “AI that knows VS Code as its actual domain.”

## Core product pillars

The v1 architecture supports four product pillars.

### 1. Explain VS Code

The assistant can inspect and explain:

- user vs workspace settings
- formatter and linter ownership
- debug configuration behavior
- task behavior
- extension interaction patterns
- keybinding behavior
- why a workspace behaves the way it does

### 2. Configure VS Code

The assistant can propose and apply bounded VS Code-specific changes to:

- user settings
- workspace settings
- `.vscode/settings.json`
- `.vscode/tasks.json`
- `.vscode/launch.json`
- `.vscode/extensions.json`
- selected keybindings
- selected profile/workspace behaviors

### 3. Repair VS Code workflows

The assistant can help diagnose and repair common VS Code-native problems, such as:

- format-on-save not working
- formatter conflicts
- linting integration issues
- broken or missing debug configurations
- broken task wiring
- extension recommendation/configuration problems
- workspace misconfiguration

### 4. Guide VS Code decisions

The assistant can recommend:

- which VS Code feature to use
- whether something belongs in settings, tasks, launch config, or extension config
- which supported extension best fits a workflow
- how to implement a VS Code-native workflow cleanly

## Core architecture rule

The backend plans. The extension executes locally.

This remains the trust boundary for the whole system.

- the backend is responsible for structured planning, validation, policy, and persistence
- the extension is responsible for context gathering, preview, approval, local execution, and undo

The backend must not directly mutate the local editor or workspace.

## System components

## 1. VS Code extension

The extension is the product surface users interact with inside VS Code.

It owns:

- chat/sidebar UI
- context gathering
- explain/inspect flows
- plan preview
- approval flow
- local execution
- undo
- local status/error presentation

The extension is where all local changes happen.

## 2. Backend API

The backend owns structured product logic, including:

- request normalization
- intent classification
- structured planning
- action generation
- risk classification
- explanation generation
- policy enforcement
- recipe selection
- persistence and traces
- provider/planner abstraction

The backend should produce typed VS Code actions, not vague instructions.

## 3. PostgreSQL

PostgreSQL supports the backend from day one.

It stores:

- runs
- plans
- action records
- explanation metadata
- risk metadata
- recipe metadata
- audit/trace metadata
- rollback references where needed

## 4. Recipe and integration layer

A recipe and integration layer provides bounded knowledge for supported workflows.

In v1, it should focus on selected areas such as:

- Python workflows
- ESLint workflows
- Prettier workflows
- selected debugging and task setup flows

This layer must stay bounded and must not become a backdoor for arbitrary tool execution.

## Request lifecycle

The normal lifecycle is:

1. User asks a VS Code-related question or requests a VS Code-related change.
2. Extension gathers bounded context relevant to the request.
3. Backend classifies the request as explain, inspect, configure, repair, or guide.
4. Backend produces either:
   - an explanation,
   - a diagnosis,
   - a recommendation,
   - or a structured action plan.
5. Extension renders the result.
6. If writes are proposed, the extension shows preview and approval.
7. If approved, the extension executes the actions locally.
8. The extension records rollback snapshots for supported write actions.
9. The user can undo supported changes.

## Request classes

All user requests in v1 should fall into one or more of these classes:

- explain
- inspect
- configure
- repair
- guide

This gives the product a broader conversational surface than a config-only assistant, without turning it into a generic coding agent.

## Context model

The extension may gather only the local context needed for the task, including:

- workspace metadata
- relevant user settings
- relevant workspace settings
- supported `.vscode/*`
- keybinding state where relevant
- selected stack markers
- selected extension presence/state

The extension should avoid broad repo ingestion unless it is directly needed for a supported VS Code workflow.

## Action model

All executable writes must be represented as structured actions.

Each action should include:

- action type
- target surface
- intended mutation
- preview payload
- risk level
- approval requirement
- rollback metadata
- execution result

The assistant should operate on VS Code-native concepts, not just generic file edits.

## Supported surfaces in v1

The v1 architecture supports these surfaces:

- user settings
- workspace settings
- `.vscode/settings.json`
- `.vscode/tasks.json`
- `.vscode/launch.json`
- `.vscode/extensions.json`
- selected keybindings
- selected extension-aware flows
- explanation/inspection of VS Code behavior across these surfaces

## Non-goals

The architecture explicitly does not optimize for:

- general feature implementation in arbitrary project code
- arbitrary shell execution
- broad machine automation
- repo-wide autonomous programming
- acting as a general replacement for Copilot, Claude Code, or Codex
- pretending to support the whole VS Code extension ecosystem deeply in v1

## Failure policy

If the backend returns:

- unsupported actions
- malformed actions
- non-previewable writes
- actions outside supported surfaces
- actions without rollback metadata for supported write categories

the extension must refuse execution clearly.

## Architecture principle

The product should be broad in VS Code domain coverage, but narrow in execution semantics.

That is how it becomes a VS Code ecosystem assistant rather than another generic coding bot.