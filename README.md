<div align="center">

# PMP - GYWD (Get Your Work Done)

**Decision-aware, context-engineered development for Claude Code.**

*Code is crystallized decisions. GYWD understands WHY code exists, not just WHAT it does.*

[![Version](https://img.shields.io/badge/version-2.0.0-blue?style=for-the-badge)](https://github.com/cyberbloke9/pmp-gywd/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

<br>

```bash
npx pmp-gywd
```

**Cross-platform: Windows, Mac, Linux**

</div>

---

## What is GYWD v2.0?

GYWD is a **unified intelligence system** that transforms AI-assisted development from "plausible text generation" to "decision-coherent engineering."

### The Problem

AI generates syntactically correct code that lacks **decision coherence**:
- Suggestions conflict with existing architectural decisions
- Context gets lost between sessions
- No understanding of WHY code exists
- Quality degrades as projects grow

### The v2.0 Solution

GYWD builds a **decision graph** of your codebase and uses four integrated systems:

| System | What It Does |
|--------|--------------|
| **Decision Graph Engine** | Extracts and links all decisions from history |
| **Context Intelligence** | Predicts what context you need before you ask |
| **Agent Orchestrator** | Coordinates specialized agents including adversarial reviewers |
| **Continuous Learning** | Improves with every interaction |

---

## Quick Start

### Installation

```bash
npx pmp-gywd
```

Select global (available everywhere) or local (current project only).

### Verify Installation

```
/gywd:help
```

### Bootstrap Any Codebase (v2.0)

```
/gywd:bootstrap
```

One command initializes the complete v2.0 system:
- Maps codebase structure
- Extracts decision graph from history
- Builds context prediction model
- Creates developer profile
- Initializes learning system

---

## The Decision Intelligence Paradigm

### Understanding WHY

```
/gywd:why src/utils/result.ts
```

**Output:**
```
DEC-015: Result pattern for error handling [88%]

Rationale: Explicit error handling without exceptions, enabling
type-safe error propagation.

Alternatives Considered:
- Try-catch blocks: Rejected - swallows errors, loses type info
- Error codes: Rejected - easy to ignore, verbose

Trade-offs:
- Gained: Type safety, explicit handling, composability
- Sacrificed: Verbosity, learning curve

Source: Commit a3f2c1 "Implement Result monad for API layer"
```

### Adversarial Review

```
/gywd:challenge .planning/phases/03-payment/03-01-PLAN.md
```

Spawns competing agents:
- **Critic**: Finds logical flaws
- **Devil's Advocate**: Argues for alternatives
- **Red Team**: Simulates security attacks
- **Chaos Agent**: Generates edge cases
- **Skeptic**: Questions assumptions

### Predictive Context

```
/gywd:anticipate --for "payment integration"
```

Pre-loads relevant decisions, patterns, and past implementations before you start working.

---

## Workflows

### New Project (Greenfield)

```bash
/gywd:new-project          # Define vision
/gywd:create-roadmap       # Generate phases
/gywd:plan-phase 1         # Plan first phase
/gywd:execute-plan         # Build it
/gywd:progress             # Check status, continue
```

### Existing Codebase (Brownfield)

```bash
/gywd:bootstrap            # Initialize v2.0 (recommended)
# OR
/gywd:map-codebase         # Analyze structure only
/gywd:extract-decisions    # Build decision graph only

/gywd:new-project          # Define additions
/gywd:create-roadmap       # Plan within architecture
```

### Daily Development

```bash
/gywd:progress             # Start of day - see status
/gywd:resume-work          # Restore session context
/gywd:pause-work           # Save state before break
```

---

## Command Reference (41 Commands)

### v2.0 Intelligence

| Command | Purpose |
|---------|---------|
| `/gywd:bootstrap` | Initialize complete v2.0 system on any codebase |
| `/gywd:why <target>` | Trace code to its originating decisions |
| `/gywd:extract-decisions` | Build decision graph from git history |
| `/gywd:history <query>` | Query temporal codebase evolution |
| `/gywd:challenge [target]` | Adversarial review with competing agents |
| `/gywd:anticipate` | Predictive context loading |
| `/gywd:profile` | Developer digital twin |
| `/gywd:impact <target>` | Connect code to production outcomes |

### Setup

| Command | Purpose |
|---------|---------|
| `/gywd:init <name>` | Quick initialization (minimal questions) |
| `/gywd:new-project` | Full initialization (guided interview) |
| `/gywd:create-roadmap` | Generate phase breakdown |
| `/gywd:map-codebase` | Analyze existing code structure |

### Planning

| Command | Purpose |
|---------|---------|
| `/gywd:plan-phase [N]` | Create detailed task plan |
| `/gywd:discuss-phase [N]` | Clarify phase vision |
| `/gywd:research-phase [N]` | Deep research for complex domains |
| `/gywd:list-phase-assumptions [N]` | Preview planned approach |
| `/gywd:preview-plan [path]` | Dry-run before execution |

### Execution

| Command | Purpose |
|---------|---------|
| `/gywd:execute-plan [path]` | Run plan (supports `--tasks 1-3`) |
| `/gywd:verify-work` | Test completed work |
| `/gywd:plan-fix` | Create fix plan for issues |

### Progress & Analysis

| Command | Purpose |
|---------|---------|
| `/gywd:status` | One-line status |
| `/gywd:progress` | Detailed progress + routing |
| `/gywd:context` | Context budget analysis |
| `/gywd:health` | Project health dashboard |
| `/gywd:deps [N]` | Dependency visualization |
| `/gywd:check-drift` | Detect spec vs implementation drift |
| `/gywd:digest [area]` | Compact codebase summary |

### Memory & Session

| Command | Purpose |
|---------|---------|
| `/gywd:memory` | Multi-session memory management |
| `/gywd:pause-work` | Save state for later |
| `/gywd:resume-work` | Restore previous session |

### Roadmap Management

| Command | Purpose |
|---------|---------|
| `/gywd:add-phase <desc>` | Append phase to roadmap |
| `/gywd:insert-phase <N> <desc>` | Insert urgent work (becomes N.1) |
| `/gywd:remove-phase <N>` | Delete future phase, renumber |

### Milestone Management

| Command | Purpose |
|---------|---------|
| `/gywd:complete-milestone <ver>` | Archive and tag release |
| `/gywd:discuss-milestone` | Plan next iteration |
| `/gywd:new-milestone <name>` | Start new milestone |

### Integration

| Command | Purpose |
|---------|---------|
| `/gywd:sync-github` | Sync with GitHub issues/PRs |
| `/gywd:rollback [target]` | Safe rollback to checkpoint |
| `/gywd:consider-issues` | Triage deferred issues |

### Utility

| Command | Purpose |
|---------|---------|
| `/gywd:help` | Complete command reference |

---

## Project Structure

```
.planning/
├── PROJECT.md              # Vision and requirements
├── ROADMAP.md              # Phase breakdown
├── STATE.md                # Session memory
├── ISSUES.md               # Deferred items
├── config.json             # Workflow settings
│
├── core/                   # v2.0 Intelligence (auto-generated)
│   ├── decisions.json      # Decision graph
│   ├── context-model.json  # Context predictions
│   └── learning-state.json # Learning system state
│
├── profile/                # Developer Digital Twin
│   └── developer.json      # Your patterns and preferences
│
├── codebase/               # Codebase analysis
│   ├── DECISIONS.md        # Human-readable decision graph
│   ├── STACK.md            # Technology stack
│   ├── ARCHITECTURE.md     # Design patterns
│   ├── STRUCTURE.md        # Organization
│   ├── CONVENTIONS.md      # Coding standards
│   ├── TESTING.md          # Test approach
│   ├── INTEGRATIONS.md     # External services
│   └── CONCERNS.md         # Technical debt
│
└── phases/                 # Work breakdown
    ├── 01-phase-name/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-phase-name/
        └── ...
```

---

## v2.0 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GYWD v2.0 Core                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Decision   │  │   Context   │  │   Agent     │             │
│  │   Graph     │◄─┤ Intelligence│◄─┤Orchestrator │             │
│  │   Engine    │  │   Engine    │  │             │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────┬───────┴────────┬───────┘                     │
│                  │                │                             │
│         ┌────────▼────────────────▼────────┐                   │
│         │     Continuous Learning System    │                   │
│         └───────────────────────────────────┘                   │
│                          │                                      │
├──────────────────────────┼──────────────────────────────────────┤
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Command Layer (41)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Philosophy

> "Code is crystallized decisions. Every function, every pattern exists because someone made a decision with context we've often lost. GYWD makes those decisions explicit and queryable."

**v1.x** was feature accumulation.
**v2.0** is unified intelligence.

The paradigm shift: Instead of generating "plausible code," GYWD generates **decision-coherent code** that respects the WHY behind your codebase.

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

**Understand decisions. Ship coherent code.**

*Built with decision intelligence by [cyberbloke9](https://github.com/cyberbloke9)*

</div>
