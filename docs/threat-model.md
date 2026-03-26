# Threat Model

## Purpose

This document defines the major risks for VS Code Control Agent in v1 and the controls used to reduce those risks.

The main product risk is not only unsafe automation.
It is also strategic drift into “just another coding agent.”

## Security and product trust goals

The product must be:

- clear about its domain
- bounded in execution
- strong at explanation
- preview-first for writes
- approval-gated for meaningful changes
- locally executed
- reversible for supported writes
- explicit about unsupported requests

## Assets to protect

The core assets are:

- user trust
- local VS Code state
- user settings
- workspace settings
- `.vscode/*`
- selected keybindings
- local workflow stability
- privacy of workspace/editor context
- the product’s differentiation

## Threat categories

## 1. Strategic drift into a generic coding agent

### Risk

The product may drift from “VS Code ecosystem assistant” into “general programming agent inside VS Code.”

That would make it less differentiated and put it into direct overlap with broader code agents.

### Controls

- define the domain as VS Code, not generic software engineering
- center explain, inspect, repair, and guide flows
- keep execution bounded to supported VS Code-native surfaces
- explicitly reject general code-implementation positioning
- keep non-goals visible in docs and implementation

---

## 2. Unsafe local automation

### Risk

The system may propose or apply changes broader than the user intended.

Examples:

- changing multiple settings unexpectedly
- introducing hidden side effects
- mutating local state without meaningful preview
- crossing from VS Code actions into arbitrary machine control

### Controls

- structured action schemas
- preview before any meaningful write
- explicit approval for writes
- bounded execution surfaces
- refusal for unsupported actions
- local execution only through known handlers

---

## 3. Over-broad execution scope

### Risk

Because the assistant is conversationally broad, it may be tempting to let it execute broadly too.

That would break the product boundary.

### Controls

- broad conversational scope, narrow execution scope
- explicit supported surfaces list
- explicit unsupported actions list
- refusal of arbitrary shell and machine actions
- no arbitrary repo-wide source editing as a core capability

---

## 4. Weak VS Code specificity

### Risk

The product may speak in generic development language instead of actually understanding VS Code-native concepts.

This would make it sound like a clone of existing coding agents.

### Controls

- model the domain around VS Code-native request classes:
  - explain
  - inspect
  - configure
  - repair
  - guide
- treat settings scopes, tasks, launch config, keybindings, and extension-aware behavior as first-class concepts
- favor VS Code-native recommendations over generic file-edit suggestions

---

## 5. Loss of reversibility

### Risk

The product may claim supported write actions are safe or undoable without real rollback support.

### Controls

- pre-change snapshots
- rollback metadata for every supported write action
- visible failure handling on rollback problems
- no claiming undo where it is not implemented

---

## 6. Privacy overreach

### Risk

The assistant may gather or send more local context than is needed for a supported VS Code task.

### Controls

- bounded context gathering
- collect only planning-relevant local state
- minimize backend payloads
- keep local execution local
- document what may leave the machine

---

## 7. Cross-extension overclaiming

### Risk

The assistant may imply deep support for the whole VS Code extension ecosystem when it only understands selected workflows well.

### Controls

- selected v1 integration list
- explicit support boundaries
- no claims of universal extension expertise
- degrade to explanation or refusal when deep execution support does not exist

---

## 8. Public usability failure

### Risk

The product may be understandable only to the builder, not to normal users.

Examples:

- vague product definition
- confusing approval model
- unclear distinction from coding agents
- unsupported actions handled ambiguously
- too much setup complexity

### Controls

- clear product language
- clear request classes
- explicit supported surfaces
- predictable refusal behavior
- clear preview and approval
- undo for supported writes
- docs written for other users, not just for implementation

## Risk levels

## Low risk

Read-only and non-mutating flows.

Examples:

- explain
- inspect
- guide
- preview
- recommend without changing state

### Handling

- allowed without approval

## Medium risk

Bounded, reversible writes to supported VS Code surfaces.

Examples:

- user settings changes
- workspace settings changes
- `.vscode/*` changes
- selected keybinding changes

### Handling

- preview required
- approval required
- rollback required

## High risk

Actions outside the supported trust boundary.

Examples:

- arbitrary shell execution
- hidden side effects
- broad machine control
- unsupported extension internals
- unsupported write surfaces
- actions without rollback support

### Handling

- refused in v1

## Trust assumptions

The product assumes:

- the backend can help plan safely, but should not execute local mutations
- the extension is the final local enforcement point
- user approval is meaningful only if the preview is understandable
- bounded VS Code-native execution is safer and more defensible than general agent autonomy

## Threat-model summary

The product succeeds by being:

- broader than a config-only helper
- narrower than a general coding agent
- strong in VS Code understanding
- conservative in execution

That balance is the actual security and product strategy.