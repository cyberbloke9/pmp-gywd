# GYWD Workflow Examples

> Complete end-to-end examples showing GYWD in action.

## Table of Contents

- [Example 1: New Project (Greenfield)](#example-1-new-project-greenfield)
- [Example 2: Existing Codebase (Brownfield)](#example-2-existing-codebase-brownfield)
- [Example 3: Daily Development Workflow](#example-3-daily-development-workflow)

---

## Example 1: New Project (Greenfield)

**Scenario:** You want to build a habit tracker CLI app from scratch.

### Step 1: Define Your Project

```bash
/gywd:new-project
```

GYWD asks questions:

```
What problem are you solving?
> I want to track daily habits and see my streaks

Who are the users?
> Just me, personal productivity tool

What are the core features?
> Add habits, mark complete, view streaks, simple CLI

What tech stack?
> Node.js CLI, JSON file storage

Any constraints?
> Keep it simple, no database needed
```

**Generated:** `.planning/PROJECT.md`

```markdown
# Project: Habit Tracker CLI

## What This Is
A personal CLI tool for tracking daily habits and viewing streaks.

## Core Value
Simple habit tracking without app overhead.

## Requirements
1. Add/remove habits
2. Mark habits complete for today
3. View current streaks
4. Persist data in JSON file

## Technical Decisions
- Runtime: Node.js
- Storage: Local JSON file (~/.habits.json)
- Interface: CLI with commander.js
```

### Step 2: Create Roadmap

```bash
/gywd:create-roadmap
```

**Output:**

```
Created roadmap with 4 phases:

Phase 1: Core data model
  - Habit entity, JSON storage

Phase 2: CLI interface
  - Commands: add, remove, done, list

Phase 3: Streak tracking
  - Calculate streaks, display stats

Phase 4: Polish
  - Error handling, help text

View full roadmap: .planning/ROADMAP.md
```

**Generated:** `.planning/ROADMAP.md`

```markdown
# Roadmap: Habit Tracker CLI

## Milestone: v1.0 MVP

### Phase 1: core-data-model
**Goal:** Define habit entity and JSON persistence
**Plans:** TBD

### Phase 2: cli-interface
**Goal:** Implement add, remove, done, list commands
**Depends on:** Phase 1

### Phase 3: streak-tracking
**Goal:** Calculate and display habit streaks
**Depends on:** Phase 2

### Phase 4: polish
**Goal:** Error handling, help text, edge cases
**Depends on:** Phase 3
```

### Step 3: Plan First Phase

```bash
/gywd:plan-phase 1
```

**Output:**

```
Planning Phase 1: core-data-model

Created: .planning/phases/01-core-data-model/01-01-PLAN.md

Tasks:
1. Create Habit type definition
2. Implement JSON file read/write
3. Add basic CRUD operations

Ready to execute? Run: /gywd:execute-plan
```

**Generated:** `.planning/phases/01-core-data-model/01-01-PLAN.md`

```markdown
---
phase: 01-core-data-model
plan: 01
---

<objective>
Implement habit data model with JSON persistence.
</objective>

<tasks>
<task type="auto">
  <name>Task 1: Create Habit type</name>
  <files>src/types.js</files>
  <action>
Define Habit with: id, name, createdAt, completions[]
  </action>
</task>

<task type="auto">
  <name>Task 2: Implement storage</name>
  <files>src/storage.js</files>
  <action>
JSON file at ~/.habits.json
Functions: load(), save(), getPath()
  </action>
</task>

<task type="auto">
  <name>Task 3: Add CRUD operations</name>
  <files>src/habits.js</files>
  <action>
Functions: create(), remove(), markDone(), list()
  </action>
</task>
</tasks>
```

### Step 4: Execute Plan

```bash
/gywd:execute-plan
```

**Output:**

```
Executing: 01-core-data-model/01-01-PLAN.md

[Task 1/3] Creating Habit type...
✓ Created src/types.js

[Task 2/3] Implementing storage...
✓ Created src/storage.js

[Task 3/3] Adding CRUD operations...
✓ Created src/habits.js

Phase 1 complete!
Created: .planning/phases/01-core-data-model/01-01-SUMMARY.md

Next: /gywd:plan-phase 2
```

### Step 5: Continue Next Day

```bash
/gywd:progress
```

**Output:**

```
# Habit Tracker CLI

**Progress:** [█░░░░░░░░░] 1/4 phases

## Recent Work
- Phase 1: Core data model complete

## Current Position
Phase 2 of 4: cli-interface
Status: Not planned

## What's Next
**Phase 2: cli-interface** — Implement CLI commands

▶ /gywd:plan-phase 2
```

---

## Example 2: Existing Codebase (Brownfield)

**Scenario:** You're adding authentication to an existing Express API.

### Step 1: Analyze the Codebase

```bash
/gywd:bootstrap
```

**Output:**

```
Analyzing codebase...

Created:
✓ .planning/codebase/STACK.md
✓ .planning/codebase/ARCHITECTURE.md
✓ .planning/codebase/CONVENTIONS.md
✓ .planning/core/decisions.json (47 decisions extracted)

Summary:
- Stack: Node.js, Express, PostgreSQL, Jest
- Architecture: MVC with service layer
- Patterns: Repository pattern, middleware chain
```

**Generated:** `.planning/codebase/ARCHITECTURE.md`

```markdown
# Architecture

## Pattern: MVC + Service Layer

```
routes/ → controllers/ → services/ → repositories/ → db
```

## Key Decisions Found

- DEC-003: Service layer between controllers and DB
- DEC-007: Repository pattern for data access
- DEC-012: Middleware for request validation
```

### Step 2: Understand Existing Code

Before adding auth, understand the current user handling:

```bash
/gywd:why src/controllers/userController.js
```

**Output:**

```
## Why: src/controllers/userController.js

**Answer:** Handles user CRUD without authentication (MVP scope).

### The Decision
When: October 2024
Who: @founder (initial commit)
Confidence: 82%

### Context
"MVP ships without auth - users identified by email only.
Auth planned for v2." — PR #1 description

### Current Status
- No password field in User model
- No session/token handling
- 12 endpoints reference this controller

### Warning
⚠️ Adding auth will require updating all 12 endpoints.
```

### Step 3: Plan the Feature

```bash
/gywd:new-project
```

```
What are you building?
> Adding JWT authentication to existing API

What's the scope?
> Login, register, protected routes, refresh tokens
```

```bash
/gywd:create-roadmap
```

**Output:**

```
Created roadmap respecting existing architecture:

Phase 1: User model updates
  - Add password field, bcrypt hashing

Phase 2: Auth endpoints
  - POST /auth/register, POST /auth/login

Phase 3: JWT middleware
  - Token generation, validation, refresh

Phase 4: Protect existing routes
  - Add auth middleware to 12 endpoints
```

### Step 4: Get Adversarial Review

```bash
/gywd:challenge .planning/phases/03-jwt-middleware/03-01-PLAN.md
```

**Output:**

```
## Adversarial Review: JWT Middleware Plan

### 🔴 Critic
"Plan doesn't specify token storage on client side.
JWTs in localStorage are vulnerable to XSS."

Recommendation: Add httpOnly cookie option.

### 🟡 Devil's Advocate
"Why JWT instead of sessions? With PostgreSQL already
in stack, sessions would be simpler."

Counter: JWT allows future microservices without shared session store.

### 🔴 Red Team
"No rate limiting on /auth/login endpoint.
Brute force attacks possible."

Recommendation: Add rate limiting task to Phase 2.

### 🟡 Skeptic
"Refresh token rotation not mentioned.
Token theft gives permanent access."

Recommendation: Add refresh token rotation to Phase 3.

---

**Summary:** 2 critical issues, 2 considerations.
Update plan before executing? (y/n)
```

### Step 5: Execute with Context

```bash
/gywd:execute-plan
```

GYWD generates code that:
- Follows existing service layer pattern
- Uses existing validation middleware style
- Matches coding conventions from CONVENTIONS.md
- References decisions when making choices

---

## Example 3: Daily Development Workflow

**Scenario:** A typical day working on a GYWD-managed project.

### Morning: Check Status

```bash
/gywd:progress
```

**Output:**

```
# E-commerce API

**Progress:** [██████░░░░] 6/10 phases

## Recent Work
- Phase 5: Payment integration complete
- Phase 6, Plan 1: Cart service complete

## Current Position
Phase 6 of 10: checkout-flow
Plan 2 of 3: Order creation
Status: Ready to execute

## Open Issues
- ISSUE-023: Cart total mismatch on currency conversion

## What's Next
**Phase 6, Plan 2** — Implement order creation from cart

▶ /gywd:execute-plan .planning/phases/06-checkout/06-02-PLAN.md
```

### Working: Execute Plan

```bash
/gywd:execute-plan
```

Work proceeds with GYWD tracking decisions...

### Stuck: Understand Existing Code

While implementing, you find confusing code:

```bash
/gywd:why src/services/pricing.js:142-158
```

**Output:**

```
## Why: Pricing service lines 142-158

**Answer:** Currency conversion with cached rates.

### The Decision
This caches exchange rates for 1 hour because:
- External API has rate limits (100/day)
- Rates don't change frequently
- Stale rate better than failed checkout

### Warning
⚠️ Related to ISSUE-023 (cart total mismatch).
Cache invalidation may be the root cause.
```

### End of Day: Save State

```bash
/gywd:pause-work
```

**Output:**

```
Saving work state...

Created: .planning/HANDOFF.md

## Session Summary
- Completed: Order creation service
- In progress: Order controller (50%)
- Blocked by: Need clarification on inventory check

## Resume Tomorrow
/gywd:resume-work

## Notes Saved
- Inventory service returns inconsistent types
- Consider adding TypeScript to Phase 8
```

### Next Day: Resume

```bash
/gywd:resume-work
```

**Output:**

```
Restoring session from 2024-01-23...

## Where You Left Off
Phase 6, Plan 2: Order creation
- Order service: ✓ Complete
- Order controller: 50% (stopped at createOrder method)

## Your Notes
- Inventory service returns inconsistent types
- Consider adding TypeScript to Phase 8

## Blockers Noted
- Need clarification on inventory check timing

Ready to continue? The order controller needs:
1. Finish createOrder method
2. Add inventory validation
3. Write tests
```

---

## Tips for Success

1. **Start with `/gywd:progress`** — Always know where you are
2. **Use `/gywd:why` liberally** — Understand before changing
3. **Run `/gywd:challenge` on complex plans** — Catch issues early
4. **End with `/gywd:pause-work`** — Never lose context
5. **Trust the decision graph** — It remembers so you don't have to

---

*See also: [Getting Started](GETTING-STARTED.md) | [Commands](COMMANDS.md) | [README](../README.md)*
