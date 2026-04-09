---
name: do-work
description: "Execute a unit of work end-to-end: plan, implement, validate with typecheck and tests, then commit. Use when user wants to do work, build a feature, fix a bug, or implement a phase from a plan."
---

# Do Work

Execute a complete unit of work: plan it, build it, validate it, commit it.

## Workflow

### 1. Understand the task

Read any referenced plan or PRD. Explore the codebase to understand the relevant files, patterns, and conventions. If the task is ambiguous, ask the user to clarify scope before proceeding.

### 2. Plan the implementation (optional)

If the task has not already been planned, create a plan for it.

### 3. Implement

**For backend code**: use strict red/green/refactor, one test at a time in a tracer-bullet style. This means literally one test → one implementation change → verified green, before writing the next test.

#### Tracer bullet test order

Order tests from thinnest vertical slice to widest:

1. **Slice 1 — Thinnest end-to-end:** Prove the core wiring works. One assertion on the most essential outcome (e.g., "a record was created with the right type"). Write this test, run it (red), write the minimum implementation to make it pass (green).
2. **Slice 2 — Widen the content:** Verify the details are correct (e.g., message format, field values). Write this test, run it (red), adjust implementation if needed (green).
3. **Slice 3+ — Widen further:** Add one new dimension per test — fan-out to multiple recipients, negative/error cases, edge cases with different inputs. Each time: write one test, run it (red), implement (green).

#### Red/green cycle discipline

- **Write exactly ONE test.** Do NOT write multiple tests before running them.
- **Run the test suite** after writing each test to confirm it fails (red).
- **Write the minimum code** to make that one test pass (green).
- **Run the test suite again** to confirm it passes.
- **Then and only then**, write the next test.
- After all slices are done, refactor if needed while keeping tests green.

#### What NOT to do

- Do not write all tests upfront and then implement everything at once — this is batch, not tracer bullet.
- Do not write a test that asserts on 5 different things when you haven't proven the basic wiring works yet.
- Do not skip running the test between red and green — the failing run is what proves the test has value.

**For frontend code**: implement directly without TDD.

### 4. Validate

Run the feedback loops and fix any issues. Repeat until both pass cleanly.

```
pnpm run typecheck
pnpm run test
```

### 5. Commit

Once typecheck and tests pass, commit the work.
