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

## Core Concepts

### Hierarchical Planning

Projects are organized into:
```
Milestones → Phases → Plans → Tasks
```

Each level has dedicated documentation that loads contextually, ensuring Claude always has relevant information without overload.

### Session Persistence

Your project state lives in `.planning/`:
- Project vision and requirements
- Current progress and position
- Decisions made along the way
- Issues deferred for later

### Isolated Execution

Each plan executes in a fresh context window. This prevents the quality degradation that occurs when context accumulates over long sessions.

---

## Getting Started

### Installation

```bash
npx pmp-gywd
```

Choose global (all projects) or local (current project only).

### Verify Installation

```
/gywd:help
```

### Recommended Setup

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

## Workflow

### New Projects

```
/gywd:new-project       # Define your vision
/gywd:create-roadmap    # Generate phases
/gywd:plan-phase 1      # Detail first phase
/gywd:execute-plan      # Build it
```

### Existing Codebases

```
/gywd:map-codebase      # Analyze current code
/gywd:new-project       # Define additions
/gywd:create-roadmap    # Plan the work
/gywd:plan-phase 1      # Detail tasks
/gywd:execute-plan      # Implement
```

### Daily Development

```
/gywd:progress          # Check status
/gywd:resume-work       # Restore context
```

---

## Codebase Analysis

For existing projects, `/gywd:map-codebase` generates comprehensive documentation:

| Document | Contents |
|----------|----------|
| `STACK.md` | Technologies and dependencies |
| `ARCHITECTURE.md` | System design patterns |
| `STRUCTURE.md` | File organization |
| `CONVENTIONS.md` | Coding standards |
| `TESTING.md` | Test infrastructure |
| `INTEGRATIONS.md` | External connections |
| `CONCERNS.md` | Technical debt |

This knowledge automatically informs all subsequent planning and execution.

---

## Command Reference

### Project Setup
| Command | Purpose |
|---------|---------|
| `/gywd:new-project` | Initialize with guided questions |
| `/gywd:create-roadmap` | Generate phase breakdown |
| `/gywd:map-codebase` | Analyze existing code |

### Planning
| Command | Purpose |
|---------|---------|
| `/gywd:plan-phase [N]` | Create detailed task plan |
| `/gywd:discuss-phase [N]` | Clarify phase vision |
| `/gywd:research-phase [N]` | Deep-dive for complex domains |
| `/gywd:list-phase-assumptions [N]` | Preview Claude's approach |

### Execution
| Command | Purpose |
|---------|---------|
| `/gywd:execute-plan` | Run current plan |
| `/gywd:verify-work [N]` | Test completed work |
| `/gywd:plan-fix [plan]` | Address issues found |

### Progress
| Command | Purpose |
|---------|---------|
| `/gywd:progress` | Status and next steps |
| `/gywd:pause-work` | Save state for later |
| `/gywd:resume-work` | Restore previous session |

### Roadmap Changes
| Command | Purpose |
|---------|---------|
| `/gywd:add-phase` | Append new phase |
| `/gywd:insert-phase [N]` | Add urgent work mid-roadmap |
| `/gywd:remove-phase [N]` | Delete future phase |

### Milestones
| Command | Purpose |
|---------|---------|
| `/gywd:complete-milestone` | Archive and tag release |
| `/gywd:discuss-milestone` | Plan next milestone |
| `/gywd:new-milestone [name]` | Start fresh milestone |

### Utilities
| Command | Purpose |
|---------|---------|
| `/gywd:consider-issues` | Review deferred items |
| `/gywd:help` | Command reference |

---

## Project Structure

```
.planning/
├── PROJECT.md          # Vision and requirements
├── ROADMAP.md          # Phase breakdown
├── STATE.md            # Session memory
├── ISSUES.md           # Deferred items
├── config.json         # Workflow settings
├── codebase/           # Code analysis docs
└── phases/
    ├── 01-name/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-name/
        └── ...
```

---

## Configuration

Set during `/gywd:new-project`:

**Interactive Mode** - Confirms decisions, pauses at checkpoints

**Autonomous Mode** - Minimal interruptions, maximum speed

Edit `.planning/config.json` to change anytime.

---

## Troubleshooting

**Commands not appearing?**
- Restart Claude Code
- Check `~/.claude/commands/gywd/` exists

**Need to reinstall?**
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
