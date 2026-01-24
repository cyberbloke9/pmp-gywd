# GYWD Command Reference

> Complete documentation for all 40 GYWD commands.

## Table of Contents

- [Daily Workflow](#daily-workflow)
- [Project Setup](#project-setup)
- [Planning](#planning)
- [Execution](#execution)
- [Understanding Code](#understanding-code)
- [Analysis](#analysis)
- [Roadmap & Milestones](#roadmap--milestones)
- [Memory & Profile](#memory--profile)
- [Integration](#integration)

---

## Daily Workflow

Commands you'll use every day.

### /gywd:status

**Show one-line project status.**

```bash
/gywd:status
```

Output:
```
PMP-GYWD: Phase 12/18 (api-documentation) • Plan 1/1 • 22% complete
```

---

### /gywd:progress

**See detailed progress and get routed to next action.**

```bash
/gywd:progress
```

Output:
```
# PMP-GYWD

**Progress:** [██░░░░░░░░] 22% (2/9 phases)

## Recent Work
- Phase 10: README overhaul complete
- Phase 11: Getting Started guide created

## Current Position
Phase 12 of 18: api-documentation
Plan: Not started

## What's Next
**Phase 12: api-documentation** — Document all 40 commands

▶ /gywd:plan-phase 12
```

---

### /gywd:resume-work

**Restore context from previous session.**

```bash
/gywd:resume-work
```

Loads:
- Last position from STATE.md
- Recent decisions and context
- Any saved handoff notes

---

### /gywd:pause-work

**Save state before stopping work.**

```bash
/gywd:pause-work
```

Creates `.planning/HANDOFF.md` with:
- Current position
- What was being worked on
- Next steps
- Any blockers

---

## Project Setup

Commands for starting new projects or analyzing existing code.

### /gywd:new-project

**Start a new project with guided interview.**

```bash
/gywd:new-project
```

GYWD asks about:
- Problem being solved
- Target users
- Core features
- Technical preferences
- Quality standards

Creates:
- `.planning/PROJECT.md`
- `.planning/STATE.md`
- Developer profile

---

### /gywd:init

**Quick start with minimal questions.**

```bash
/gywd:init <project-name>
```

Example:
```bash
/gywd:init habit-tracker
```

Creates basic `.planning/` structure without full interview.

---

### /gywd:bootstrap

**Analyze existing codebase completely.**

```bash
/gywd:bootstrap
```

Creates:
- `.planning/codebase/STACK.md` — Technologies
- `.planning/codebase/ARCHITECTURE.md` — Patterns
- `.planning/codebase/CONVENTIONS.md` — Standards
- `.planning/codebase/TESTING.md` — Test approach
- `.planning/core/decisions.json` — Decision graph

---

### /gywd:map-codebase

**Scan and document code structure only.**

```bash
/gywd:map-codebase
```

Lighter than bootstrap — creates codebase docs without decision extraction.

---

### /gywd:create-roadmap

**Generate phase breakdown for project.**

```bash
/gywd:create-roadmap
```

Creates `.planning/ROADMAP.md` with:
- Milestone overview
- Phase breakdown
- Dependencies between phases

---

## Planning

Commands for planning work before execution.

### /gywd:plan-phase

**Create detailed task plan for a phase.**

```bash
/gywd:plan-phase [N]
```

Example:
```bash
/gywd:plan-phase 3
```

Creates `.planning/phases/03-*/03-01-PLAN.md` with:
- Objective
- Tasks with actions
- Verification steps
- Success criteria

---

### /gywd:discuss-phase

**Clarify requirements before planning.**

```bash
/gywd:discuss-phase [N]
```

Interactive session to:
- Understand phase goals
- Identify unknowns
- Gather context

Creates `{phase}-CONTEXT.md` for reference during planning.

---

### /gywd:research-phase

**Investigate unknowns before planning.**

```bash
/gywd:research-phase [N]
```

For phases marked "Research: Likely" in roadmap. Explores:
- Technical approaches
- External dependencies
- Best practices

---

### /gywd:list-phase-assumptions

**See what Claude assumes about a phase.**

```bash
/gywd:list-phase-assumptions [N]
```

Surfaces assumptions before planning so you can correct them.

---

### /gywd:preview-plan

**Dry-run plan without executing.**

```bash
/gywd:preview-plan [path]
```

Example:
```bash
/gywd:preview-plan .planning/phases/03-auth/03-01-PLAN.md
```

Shows what would happen without making changes.

---

## Execution

Commands for building and verifying work.

### /gywd:execute-plan

**Run a plan file.**

```bash
/gywd:execute-plan [path]
```

Options:
```bash
/gywd:execute-plan --tasks 1-3    # Run specific tasks only
/gywd:execute-plan                 # Auto-detect next plan
```

Creates `*-SUMMARY.md` when complete.

---

### /gywd:verify-work

**Test completed work with user.**

```bash
/gywd:verify-work [phase]
```

Guided UAT session:
- Shows what was built
- Asks user to verify
- Records issues found

Creates `*-ISSUES.md` if problems found.

---

### /gywd:plan-fix

**Create fix plan for found issues.**

```bash
/gywd:plan-fix [plan]
```

Reads `*-ISSUES.md` and creates `*-FIX.md` with repair tasks.

---

## Understanding Code

Commands for understanding why code exists.

### /gywd:why

**Trace code to its original decisions.**

```bash
/gywd:why <target>
```

Examples:
```bash
/gywd:why src/auth/login.ts
/gywd:why "the retry logic in payments"
/gywd:why --deep src/api/orders.ts:142-158
```

Output:
```
## Why: src/auth/login.ts

**Answer:** JWT authentication for stateless API auth.

### The Decision
When: March 2024
Who: @alice (PR #47)
Confidence: 94%

### Alternatives Rejected
- Sessions (state management overhead)
- API keys (no user context)

### Trade-offs
✅ Stateless, scalable
⚠️ Token refresh complexity
```

---

### /gywd:history

**See how code evolved over time.**

```bash
/gywd:history <query>
```

Example:
```bash
/gywd:history "authentication"
```

Shows timeline of changes to authentication-related code.

---

### /gywd:extract-decisions

**Build decision graph from git history.**

```bash
/gywd:extract-decisions
```

Analyzes commits, PRs, and comments to create `.planning/core/decisions.json`.

---

### /gywd:anticipate

**Pre-load context for upcoming work.**

```bash
/gywd:anticipate --for "<topic>"
```

Example:
```bash
/gywd:anticipate --for "payment integration"
```

Loads relevant decisions, patterns, and files before you start.

---

### /gywd:challenge

**Get adversarial review of plan or code.**

```bash
/gywd:challenge [target]
```

Example:
```bash
/gywd:challenge .planning/phases/03-payment/03-01-PLAN.md
```

Spawns competing review agents:
- **Critic** — Finds logical flaws
- **Devil's Advocate** — Argues alternatives
- **Red Team** — Security concerns
- **Skeptic** — Questions assumptions

---

## Analysis

Commands for analyzing project state.

### /gywd:context

**Show context budget usage.**

```bash
/gywd:context
```

Shows how much context is loaded and what's using it.

---

### /gywd:health

**Display project health dashboard.**

```bash
/gywd:health
```

Shows:
- Test coverage
- Documentation coverage
- Technical debt indicators
- Phase completion rates

---

### /gywd:deps

**Visualize phase dependencies.**

```bash
/gywd:deps [N]
```

Shows which phases depend on which.

---

### /gywd:check-drift

**Detect spec vs implementation drift.**

```bash
/gywd:check-drift
```

Compares PROJECT.md requirements against actual implementation.

---

### /gywd:digest

**Generate compact codebase summary.**

```bash
/gywd:digest [area]
```

Example:
```bash
/gywd:digest src/auth
```

Creates condensed overview for quick context refresh.

---

### /gywd:consider-issues

**Triage deferred issues.**

```bash
/gywd:consider-issues
```

Reviews `.planning/ISSUES.md` and helps prioritize.

---

## Roadmap & Milestones

Commands for managing project roadmap.

### /gywd:add-phase

**Append new phase to roadmap.**

```bash
/gywd:add-phase <description>
```

Example:
```bash
/gywd:add-phase "Add export functionality"
```

---

### /gywd:insert-phase

**Insert urgent work between phases.**

```bash
/gywd:insert-phase <N> <description>
```

Example:
```bash
/gywd:insert-phase 5 "Critical security fix"
```

Creates Phase 5.1 without renumbering existing phases.

---

### /gywd:remove-phase

**Delete a future phase.**

```bash
/gywd:remove-phase <N>
```

Removes phase and renumbers subsequent phases.

---

### /gywd:new-milestone

**Start a new milestone.**

```bash
/gywd:new-milestone <name>
```

Example:
```bash
/gywd:new-milestone "v2.0 Mobile Support"
```

---

### /gywd:discuss-milestone

**Plan next milestone interactively.**

```bash
/gywd:discuss-milestone
```

Guided session to define milestone scope and phases.

---

### /gywd:complete-milestone

**Archive milestone and tag release.**

```bash
/gywd:complete-milestone
```

- Archives completed phases
- Creates git tag
- Updates STATE.md for next milestone

---

## Memory & Profile

Commands for managing learning and preferences.

### /gywd:memory

**Manage cross-session memory.**

```bash
/gywd:memory
```

Options:
```bash
/gywd:memory --show          # View stored patterns
/gywd:memory --clear         # Reset memory
/gywd:memory --export        # Export for team sharing
```

---

### /gywd:profile

**View/edit your learned preferences.**

```bash
/gywd:profile
```

Shows your Developer Digital Twin:
- Coding style preferences
- Communication preferences
- Expertise areas
- Learned patterns

---

### /gywd:impact

**Connect code to real-world outcomes.**

```bash
/gywd:impact <target>
```

Example:
```bash
/gywd:impact src/checkout/payment.ts
```

Shows how code connects to business metrics and user outcomes.

---

## Integration

Commands for external integrations.

### /gywd:sync-github

**Sync with GitHub issues and PRs.**

```bash
/gywd:sync-github
```

- Creates GitHub issues from ISSUES.md
- Links PRs to phases
- Updates milestone progress

---

### /gywd:rollback

**Rollback to checkpoint safely.**

```bash
/gywd:rollback [target]
```

Example:
```bash
/gywd:rollback phase-10
```

Restores to a previous checkpoint.

---

### /gywd:help

**Show all available commands.**

```bash
/gywd:help
```

Lists all 40 commands with brief descriptions.

---

## Quick Reference

| Category | Commands |
|----------|----------|
| Daily | status, progress, resume-work, pause-work |
| Setup | new-project, init, bootstrap, map-codebase, create-roadmap |
| Planning | plan-phase, discuss-phase, research-phase, list-phase-assumptions, preview-plan |
| Execution | execute-plan, verify-work, plan-fix |
| Understanding | why, history, extract-decisions, anticipate, challenge |
| Analysis | context, health, deps, check-drift, digest, consider-issues |
| Roadmap | add-phase, insert-phase, remove-phase, new-milestone, discuss-milestone, complete-milestone |
| Memory | memory, profile, impact |
| Integration | sync-github, rollback, help |

---

*See also: [Getting Started](GETTING-STARTED.md) | [README](../README.md)*
