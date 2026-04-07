---
name: do-work
description: Execute a complete unit of work — plan, implement, validate, and commit. Use when user asks to do work, implement a feature, fix a bug, complete a task, or mentions "do-work".
---

# Do Work
Execute a unit of work from planning(optional) through commit.

## Workflow

### Phase 1 — Plan (Optional)
If the task has not already been planned, create a plan for it:

### Phase 2 — Implement
Follow the approved plan step by step
Keep changes minimal — only what the plan calls for

### Phase 3 — Validate (feedback loop)
Run both checks and fix issues until both pass cleanly:

```
pnpm typecheck
pnpm run test
```
Re-run both after fixes to confirm clean output

### Phase 4 — Commit
Only after Phase 3 passes:
Create the commit