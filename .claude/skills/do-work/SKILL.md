---
name: do-work
description: Execute a complete unit of work — plan, implement, validate, and commit. Use when user asks to do work, implement a feature, fix a bug, complete a task, or mentions "do-work".
---

# Do Work
Execute a unit of work from planning(optional) through commit.

## Workflow

### Phase 1 — Understand the Task
Before writing any code, build a clear picture of what needs to happen:
- Read the referenced plan, PRD, or issue to understand scope and requirements
- Explore the codebase to find relevant files, existing patterns, and conventions
- Ask the user to clarify ambiguities rather than assuming

### Phase 2 — Plan (Optional)
If the task has not already been planned, create a plan for it:

### Phase 3 — Implement
Follow the approved plan step by step
Keep changes minimal — only what the plan calls for

### Phase 4 — Validate (feedback loop)
Run both checks and fix issues until both pass cleanly:

```
pnpm typecheck
pnpm run test
```
Re-run both after fixes to confirm clean output

### Phase 5 — Commit
Only after Phase 4 passes:
Create the commit