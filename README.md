<div align="center">

# PMP - GYWD (Get Your Work Done)

**A context-aware development framework for Claude Code that transforms how you ship MVPs.**

[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

<br>

```bash
npx pmp-gywd
```

**Cross-platform: Windows, Mac, Linux**

</div>

---

## What is GYWD?

GYWD is a structured development framework that leverages Claude Code's capabilities through intelligent context management. It solves the fundamental challenge of AI-assisted coding: maintaining quality and consistency throughout complex projects.

### The Problem

When working with AI coding assistants on larger projects, you'll notice:
- Quality drops as conversations get longer
- Context gets lost between sessions
- Instructions need constant repetition
- Output becomes inconsistent

### The Solution

GYWD implements a **context engineering architecture** that:
- Preserves project knowledge across sessions
- Breaks work into optimally-sized chunks
- Maintains consistent output quality
- Automates documentation and version control

---

## Quick Start

### Installation

```bash
npx pmp-gywd
```

Select global (available everywhere) or local (current project only) when prompted.

### Verify It Works

```
/gywd:help
```

---

## Starting Fresh: New Project Guide

Building something from scratch? Follow this path:

### Step 1: Define Your Vision

```
/gywd:new-project
```

GYWD conducts a structured interview to understand:
- What you're building and why
- Core features vs nice-to-haves
- Technical preferences and constraints
- Edge cases and potential challenges

**Output:** `.planning/PROJECT.md` containing your complete project brief

### Step 2: Generate Your Roadmap

```
/gywd:create-roadmap
```

Based on your project brief, GYWD creates:
- Logical phases from foundation to completion
- Dependencies between phases
- Session memory for continuity

**Output:** `.planning/ROADMAP.md` and `.planning/STATE.md`

### Step 3: Plan Your First Phase

```
/gywd:plan-phase 1
```

Transforms phase objectives into concrete tasks with:
- Specific implementation steps
- Files to create or modify
- Verification criteria
- Success definitions

**Output:** `.planning/phases/01-name/01-01-PLAN.md`

### Step 4: Execute

```
/gywd:execute-plan
```

Claude implements each task autonomously:
- Works through tasks sequentially
- Commits after each completion
- Documents what was built
- Updates project state

### Step 5: Continue

```
/gywd:progress
```

See where you stand and what's next. Repeat steps 3-5 for each phase until your MVP ships.

---

## Adding to Existing Code: Brownfield Guide

Have a codebase already? GYWD needs to understand it first.

### Step 1: Analyze Your Codebase

```
/gywd:map-codebase
```

GYWD deploys parallel analysis agents that examine:
- Technology stack and dependencies
- Architecture patterns and data flow
- Directory structure and organization
- Coding conventions and standards
- Test setup and coverage
- External integrations
- Technical debt and concerns

**Output:** Seven focused documents in `.planning/codebase/`

| Document | What It Captures |
|----------|------------------|
| `STACK.md` | Languages, frameworks, package dependencies |
| `ARCHITECTURE.md` | Design patterns, layers, how data moves |
| `STRUCTURE.md` | Folder organization, where things belong |
| `CONVENTIONS.md` | Naming patterns, code style, standards |
| `TESTING.md` | Test framework, patterns, coverage approach |
| `INTEGRATIONS.md` | APIs, databases, external services |
| `CONCERNS.md` | Tech debt, fragile areas, known issues |

### Step 2: Define What You're Adding

```
/gywd:new-project
```

With codebase knowledge loaded, GYWD asks targeted questions about:
- Features you want to add
- Changes to existing functionality
- How new code should integrate
- Constraints from current architecture

### Step 3: Plan Within Your Architecture

```
/gywd:create-roadmap
```

Roadmap respects your existing patterns:
- Phases align with your structure
- Tasks use your conventions
- Integration points identified

### Step 4: Execute With Context

```
/gywd:plan-phase 1
/gywd:execute-plan
```

Implementation automatically follows:
- Your naming conventions
- Your file organization
- Your testing patterns
- Your architectural style

---

## Daily Development Workflow

### Starting Your Day

```
/gywd:progress
```

Shows:
- Visual progress indicator
- Recent completions
- Current position
- Suggested next action

### Resuming After a Break

```
/gywd:resume-work
```

Restores full context from your last session including decisions made and work in progress.

### Pausing Mid-Work

```
/gywd:pause-work
```

Captures current state so you can resume seamlessly later.

---

## Handling Changes Mid-Project

### Need to Add a Phase?

```
/gywd:add-phase
```

Appends new work to your roadmap without disrupting existing phases.

### Urgent Work Can't Wait?

```
/gywd:insert-phase 3
```

Inserts critical work between phases 3 and 4 (becomes phase 3.1).

### Phase No Longer Needed?

```
/gywd:remove-phase 5
```

Removes phase 5 and renumbers subsequent phases automatically.

---

## Completing Milestones

### Ship a Version

```
/gywd:complete-milestone
```

Archives everything, creates a git tag, prepares for the next version.

### Plan What's Next

```
/gywd:discuss-milestone
```

Review what shipped, identify improvements, plan the next iteration.

---

## Command Reference

### Setup Commands
| Command | Purpose |
|---------|---------|
| `/gywd:new-project` | Initialize with guided questions |
| `/gywd:create-roadmap` | Generate phase breakdown |
| `/gywd:map-codebase` | Analyze existing code |

### Planning Commands
| Command | Purpose |
|---------|---------|
| `/gywd:plan-phase [N]` | Create detailed task plan |
| `/gywd:discuss-phase [N]` | Clarify phase vision |
| `/gywd:research-phase [N]` | Deep-dive for complex domains |
| `/gywd:list-phase-assumptions [N]` | Preview planned approach |

### Execution Commands
| Command | Purpose |
|---------|---------|
| `/gywd:execute-plan` | Run current plan |
| `/gywd:verify-work [N]` | Test completed work |
| `/gywd:plan-fix [plan]` | Address found issues |

### Progress Commands
| Command | Purpose |
|---------|---------|
| `/gywd:progress` | Status and next steps |
| `/gywd:pause-work` | Save state for later |
| `/gywd:resume-work` | Restore previous session |

### Roadmap Commands
| Command | Purpose |
|---------|---------|
| `/gywd:add-phase` | Append new phase |
| `/gywd:insert-phase [N]` | Add urgent work mid-roadmap |
| `/gywd:remove-phase [N]` | Delete future phase |

### Milestone Commands
| Command | Purpose |
|---------|---------|
| `/gywd:complete-milestone` | Archive and tag release |
| `/gywd:discuss-milestone` | Plan next milestone |
| `/gywd:new-milestone [name]` | Start fresh milestone |

### Utility Commands
| Command | Purpose |
|---------|---------|
| `/gywd:consider-issues` | Review deferred items |
| `/gywd:help` | Show command reference |

---

## Project Structure

```
.planning/
├── PROJECT.md          # Your vision and requirements
├── ROADMAP.md          # Phase breakdown and progress
├── STATE.md            # Memory across sessions
├── ISSUES.md           # Parked items for later
├── config.json         # Workflow preferences
├── codebase/           # Analysis docs (brownfield)
│   ├── STACK.md
│   ├── ARCHITECTURE.md
│   ├── STRUCTURE.md
│   ├── CONVENTIONS.md
│   ├── TESTING.md
│   ├── INTEGRATIONS.md
│   └── CONCERNS.md
└── phases/
    ├── 01-phase-name/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-phase-name/
        └── ...
```

---

## Recommended Setup

For uninterrupted automation:

```bash
claude --dangerously-skip-permissions
```

<details>
<summary><strong>Alternative: Selective Permissions</strong></summary>

Add to `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git status:*)",
      "Bash(git log:*)",
      "Bash(git diff:*)"
    ]
  }
}
```
</details>

---

## Troubleshooting

**Commands not appearing?**
- Restart Claude Code to reload commands
- Verify files exist in `~/.claude/commands/gywd/`

**Need latest version?**
```bash
npx pmp-gywd@latest
```

---

## License

MIT License - See [LICENSE](LICENSE)

---

<div align="center">

**Ship faster. Stay consistent.**

</div>
