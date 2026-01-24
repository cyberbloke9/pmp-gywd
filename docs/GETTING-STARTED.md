# Getting Started with GYWD

> From zero to your first AI-assisted feature in 10 minutes.

## Prerequisites

- **Node.js 18+** installed
- **Claude Code CLI** installed and authenticated
- A project to work on (or an idea for one)

## Installation

### Quick Install

```bash
npx pmp-gywd
```

Choose:
- **Global** — Available in all projects (recommended)
- **Local** — This project only

### Verify Installation

Open Claude Code and run:

```bash
/gywd:help
```

You should see 40 commands listed. If commands don't appear, restart Claude Code.

---

## Choose Your Path

| Your Situation | Start Here |
|----------------|------------|
| New idea, starting fresh | [Path A: New Project](#path-a-new-project) |
| Existing codebase | [Path B: Existing Codebase](#path-b-existing-codebase) |

---

## Path A: New Project

**Time:** ~5 minutes

You have an idea and want to build it from scratch.

### Step 1: Define Your Project

```bash
/gywd:new-project
```

GYWD will ask you about:
- What problem you're solving
- Who the users are
- Core features needed
- Technical preferences (language, framework)

**Example answers:**
```
Problem: "I want to track my daily habits"
Users: "Just me, for personal use"
Features: "Add habits, mark complete, see streaks"
Tech: "Node.js CLI app"
```

After answering, GYWD creates:
- `.planning/PROJECT.md` — Your vision documented
- `.planning/STATE.md` — Session memory
- Developer profile (learns your patterns over time)

### Step 2: Create Your Roadmap

```bash
/gywd:create-roadmap
```

GYWD breaks your idea into phases. For example:

```
Phase 1: Core data model
Phase 2: CLI interface
Phase 3: Streak tracking
Phase 4: Notifications
```

Creates `.planning/ROADMAP.md` with the full plan.

### Step 3: Plan Your First Phase

```bash
/gywd:plan-phase 1
```

Creates a detailed task plan in `.planning/phases/01-*/01-01-PLAN.md`.

Review the plan — it shows exactly what will be built.

### Step 4: Execute!

```bash
/gywd:execute-plan
```

GYWD builds your first phase with AI assistance:
- Writes code based on your decisions
- Tracks every choice made
- Creates summary when done

### Step 5: Continue Tomorrow

```bash
/gywd:progress
```

See where you left off and what's next. GYWD routes you to the right command.

```bash
/gywd:resume-work
```

Restore full context from your previous session.

---

## Path B: Existing Codebase

**Time:** ~5 minutes

You have code and want GYWD to understand it.

### Step 1: Analyze Your Codebase

```bash
/gywd:bootstrap
```

GYWD scans your code and creates:

| File | Contents |
|------|----------|
| `.planning/codebase/STACK.md` | Technologies used |
| `.planning/codebase/ARCHITECTURE.md` | Design patterns |
| `.planning/codebase/CONVENTIONS.md` | Coding standards |
| `.planning/codebase/TESTING.md` | Test approach |
| `.planning/core/decisions.json` | Decision graph from git |

### Step 2: Understand Existing Code

Trace any file to its original decisions:

```bash
/gywd:why src/auth/login.ts
```

Output:
```
DEC-015: JWT authentication [88% confidence]

Rationale: Stateless auth for API scalability
Alternatives rejected: Sessions (state management overhead)
Source: Commit a3f2c1 "Add JWT auth layer"
```

See how a feature evolved:

```bash
/gywd:history "authentication"
```

### Step 3: Add a New Feature

Define what you're adding (GYWD respects existing architecture):

```bash
/gywd:new-project
```

Then plan and execute:

```bash
/gywd:create-roadmap
/gywd:plan-phase 1
/gywd:execute-plan
```

GYWD ensures new code is consistent with existing patterns.

### Step 4: Daily Workflow

```bash
/gywd:progress      # Start of day — see what's next
/gywd:pause-work    # Before stopping — save context
/gywd:resume-work   # Pick up where you left off
```

---

## Quick Command Reference

| When You Want To... | Run |
|---------------------|-----|
| Start a new project | `/gywd:new-project` |
| Analyze existing code | `/gywd:bootstrap` |
| See project status | `/gywd:progress` |
| Plan next phase | `/gywd:plan-phase` |
| Build the plan | `/gywd:execute-plan` |
| Understand why code exists | `/gywd:why <file>` |
| Get AI review | `/gywd:challenge` |
| Save work in progress | `/gywd:pause-work` |
| Resume previous session | `/gywd:resume-work` |

---

## What's Next?

**Explore more commands:**
```bash
/gywd:help
```

**Get adversarial review of your plans:**
```bash
/gywd:challenge .planning/phases/01-*/01-01-PLAN.md
```

**Pre-load context before working:**
```bash
/gywd:anticipate --for "user authentication"
```

**View your learned preferences:**
```bash
/gywd:profile
```

**See complete workflow examples:**
- [Workflow Examples](EXAMPLES.md) — End-to-end scenarios

---

## Troubleshooting

**Commands not appearing?**
- Restart Claude Code
- Verify files in `~/.claude/commands/gywd/`

**Nothing happening when commands run?**
- Check `.planning/` directory exists
- Run `/gywd:init` if missing

**Lost context mid-session?**
- Run `/gywd:resume-work`

---

*Need help? [Open an issue](https://github.com/cyberbloke9/pmp-gywd/issues)*
