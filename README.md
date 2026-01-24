<div align="center">

# PMP - GYWD (Get Your Work Done)

**Ship faster with AI that remembers your decisions.**

*The context engineering framework for Claude Code — 40 commands · 557 tests · Zero runtime deps*

[![Version](https://img.shields.io/badge/version-3.3.1-blue?style=for-the-badge)](https://github.com/cyberbloke9/pmp-gywd/releases)
[![Tests](https://img.shields.io/badge/tests-557%20passing-brightgreen?style=for-the-badge)](https://github.com/cyberbloke9/pmp-gywd/actions)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

<br>

```bash
npx pmp-gywd
```

**Cross-platform: Windows, Mac, Linux**

</div>

---

## What's New in v3.3?

**Polish, Docs & Stability** — Comprehensive documentation and npm publishing.

| Added | Description |
|-------|-------------|
| **[Getting Started](docs/GETTING-STARTED.md)** | Step-by-step tutorial for new users |
| **[Commands Reference](docs/COMMANDS.md)** | All 40 commands documented |
| **[Examples](docs/EXAMPLES.md)** | Greenfield, brownfield, and daily workflows |
| **[Contributing](docs/CONTRIBUTING.md)** | Developer guide with error handling patterns |
| **[Releasing](docs/RELEASING.md)** | Maintainer release guide |

---

### v3.2: Enhanced Learning System

**Cross-project memory and team pattern sharing.**

| Module | What It Does |
|--------|--------------|
| **GlobalMemory** | Persist patterns across projects in `~/.gywd/global/` |
| **PatternAggregator** | Detect consensus, identify outliers, Bayesian boosting |
| **FeedbackCollector** | Track suggestion outcomes, detect suppression |
| **ConfidenceCalibrator** | Beta-Binomial Bayesian confidence scoring |
| **TeamSync** | Export/import patterns with conflict resolution |

```
          v3.2 Enhanced Learning System
┌─────────────────────────────────────────────┐
│  GlobalMemory ◄──────► PatternAggregator    │
│  (persistence)         (consensus)          │
│       │                      │              │
│       ▼                      ▼              │
│  TeamSync            ConfidenceCalibrator   │
│  (sharing)              (Bayesian)          │
│                              │              │
│              ┌───────────────┘              │
│              ▼                              │
│       FeedbackCollector                     │
│         (learning)                          │
└─────────────────────────────────────────────┘
```

### v3.0: Sophisticated Brain

| Engine | What It Does |
|--------|--------------|
| **Profile Engine** | Developer Digital Twin — learns your patterns |
| **Questioning Engine** | Adaptive questions that skip what's known |
| **Context Predictor** | Pre-loads relevant context before you ask |
| **Automation Framework** | Dependency analysis, test/doc generation |

```
          v3.0 Sophisticated Brain
┌─────────────────────────────────────────────┐
│   Profile ◄──────► Questioning              │
│   Engine            Engine                  │
│       │                │                    │
│       └───────┬────────┘                    │
│               ▼                             │
│       Context Predictor                     │
│      (Analyzer + Cache)                     │
│               │                             │
│               ▼                             │
│       Continuous Learning                   │
└─────────────────────────────────────────────┘
```

*See [CHANGELOG.md](CHANGELOG.md) for full version history.*

---

## What is GYWD?

**The problem:** AI generates code that conflicts with your existing decisions, forgets context between sessions, and degrades as projects grow.

**The solution:** GYWD builds a decision graph of your codebase and maintains persistent context across sessions.

| Challenge | How GYWD Solves It |
|-----------|-------------------|
| Lost context between sessions | Decision graph + persistent memory |
| AI conflicts with architecture | Checks new code against existing decisions |
| "Why was this built this way?" | `/gywd:why` traces code to decisions |

---

## Getting Started

### 1. Install

```bash
npx pmp-gywd
```

Choose **global** (all projects) or **local** (this project only).

### 2. Verify

```bash
/gywd:help
```

### 3. Start Working

| Your Situation | Command |
|----------------|---------|
| New project from scratch | `/gywd:new-project` |
| Existing codebase | `/gywd:bootstrap` |

**New to GYWD?** See the [tutorial](docs/GETTING-STARTED.md) or [workflow examples](docs/EXAMPLES.md).

---

## Quick Reference

| Situation | Command |
|-----------|---------|
| Brand new idea | `/gywd:new-project` |
| Existing codebase | `/gywd:bootstrap` |
| Start of day | `/gywd:progress` |
| Returning after break | `/gywd:resume-work` |
| Why does this code exist? | `/gywd:why <file>` |
| Plan next feature | `/gywd:plan-phase` |
| Execute the plan | `/gywd:execute-plan` |
| Review my approach | `/gywd:challenge` |
| Save state before stopping | `/gywd:pause-work` |

*See `/gywd:help` for all 40 commands*

---

## Starting Fresh (New Project)

**Run:** `/gywd:new-project`

GYWD interviews you about your vision, then:
- Creates `PROJECT.md` with requirements
- Builds your developer profile
- Records preferences for future sessions

**Typical flow:**
```bash
/gywd:new-project      # Define vision
/gywd:create-roadmap   # Generate phases
/gywd:plan-phase 1     # Plan first phase
/gywd:execute-plan     # Build it
/gywd:progress         # Continue next day
```

---

## Existing Codebase

**Run:** `/gywd:bootstrap`

GYWD analyzes your code and builds:
- `STACK.md`, `ARCHITECTURE.md`, `CONVENTIONS.md` — codebase documentation
- `decisions.json` — decision graph extracted from git history
- Context model for predictive loading

**Typical flow:**
```bash
/gywd:bootstrap        # Analyze codebase
/gywd:new-project      # Define new feature
/gywd:plan-phase 1     # Plan implementation
/gywd:execute-plan     # Build with context
/gywd:why <file>       # Understand existing code
```

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
/gywd:bootstrap            # Initialize v3.0 (recommended)
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

## Command Reference (40 Commands)

### Daily Workflow

| Command | What It Does |
|---------|--------------|
| `/gywd:status` | Show one-line project status |
| `/gywd:progress` | See what's next and resume work |
| `/gywd:resume-work` | Restore context from previous session |
| `/gywd:pause-work` | Save state before stopping |

### Project Setup

| Command | What It Does |
|---------|--------------|
| `/gywd:new-project` | Start new project with guided interview |
| `/gywd:init <name>` | Quick start with minimal questions |
| `/gywd:bootstrap` | Analyze existing codebase completely |
| `/gywd:map-codebase` | Scan and document code structure |
| `/gywd:create-roadmap` | Generate phase breakdown |

### Planning

| Command | What It Does |
|---------|--------------|
| `/gywd:plan-phase [N]` | Create detailed task plan for phase |
| `/gywd:discuss-phase [N]` | Clarify requirements before planning |
| `/gywd:research-phase [N]` | Investigate unknowns before planning |
| `/gywd:list-phase-assumptions [N]` | See what Claude assumes about phase |
| `/gywd:preview-plan [path]` | Dry-run plan without executing |

### Execution

| Command | What It Does |
|---------|--------------|
| `/gywd:execute-plan [path]` | Run plan (supports `--tasks 1-3`) |
| `/gywd:verify-work` | Test completed work with user |
| `/gywd:plan-fix` | Create fix plan for found issues |

### Understanding Code

| Command | What It Does |
|---------|--------------|
| `/gywd:why <target>` | Trace code to its original decisions |
| `/gywd:history <query>` | See how code evolved over time |
| `/gywd:extract-decisions` | Build decision graph from git |
| `/gywd:anticipate` | Pre-load context for upcoming work |
| `/gywd:challenge [target]` | Get adversarial review of plan/code |

### Analysis

| Command | What It Does |
|---------|--------------|
| `/gywd:context` | Show context budget usage |
| `/gywd:health` | Display project health dashboard |
| `/gywd:deps [N]` | Visualize phase dependencies |
| `/gywd:check-drift` | Detect spec vs implementation drift |
| `/gywd:digest [area]` | Generate compact codebase summary |
| `/gywd:consider-issues` | Triage deferred issues |

### Roadmap & Milestones

| Command | What It Does |
|---------|--------------|
| `/gywd:add-phase <desc>` | Append new phase to roadmap |
| `/gywd:insert-phase <N> <desc>` | Insert urgent work as N.1 |
| `/gywd:remove-phase <N>` | Delete phase and renumber |
| `/gywd:new-milestone <name>` | Start new milestone |
| `/gywd:discuss-milestone` | Plan next milestone interactively |
| `/gywd:complete-milestone` | Archive milestone and tag release |

### Memory & Profile

| Command | What It Does |
|---------|--------------|
| `/gywd:memory` | Manage cross-session memory |
| `/gywd:profile` | View/edit your learned preferences |
| `/gywd:impact <target>` | Connect code to real-world outcomes |

### Integration

| Command | What It Does |
|---------|--------------|
| `/gywd:sync-github` | Sync with GitHub issues and PRs |
| `/gywd:rollback [target]` | Rollback to checkpoint safely |
| `/gywd:help` | Show all available commands |

**Full documentation:** See [docs/COMMANDS.md](docs/COMMANDS.md) for detailed usage and examples.

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
├── core/                   # Intelligence (auto-generated)
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

## Library Modules

```javascript
// Memory (v3.2) - Cross-project learning
const { GlobalMemory, PatternAggregator, TeamSync } = require('pmp-gywd/lib/memory');

// Profile & Questioning
const { ProfileManager } = require('pmp-gywd/lib/profile');
const { QuestionEngine } = require('pmp-gywd/lib/questioning');

// Context & Automation
const { ContextPredictor } = require('pmp-gywd/lib/context');
const { DependencyAnalyzer } = require('pmp-gywd/lib/automation');

// Validators
const { validateJsonSyntax } = require('pmp-gywd/lib/validators');
```

**7 modules** · **Zero runtime dependencies** · Works offline

---

## Architecture (v3.3)

```
┌─────────────────────────────────────────────────────────┐
│                    GYWD v3.3 Core                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │ Decision  │  │  Context  │  │   Agent   │           │
│  │   Graph   │◄─┤Intelligence│◄─┤Orchestrator│          │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘           │
│        └───────┬──────┴──────┬───────┘                 │
│                ▼             ▼                         │
│  ┌────────────────────────────────────────────┐       │
│  │              v3.0 Brain                     │       │
│  │  Profile ◄──► Questioning ──► Predictor    │       │
│  │            Continuous Learning              │       │
│  └─────────────────────┬──────────────────────┘       │
│                        ▼                               │
│  ┌────────────────────────────────────────────┐       │
│  │           v3.2 Memory Module               │       │
│  │  GlobalMemory · PatternAggregator · TeamSync│      │
│  └─────────────────────┬──────────────────────┘       │
│                        ▼                               │
│  ┌────────────────────────────────────────────┐       │
│  │            Command Layer (40)               │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## CI/CD Pipeline

- **12 test matrix combinations** (3 OS x 4 Node versions)
- **557 automated tests** with Jest (22 test suites)
- **ESLint** with zero external plugins
- **Schema validation** for all JSON files
- **Command validation** for all 40 commands
- **Security scanning** with npm audit

```bash
npm run precommit    # Run all checks locally
npm test             # Run tests
npm run lint         # Run linter
npm run validate:all # Validate schemas and commands
```

---

## Philosophy

> "Code is crystallized decisions. Every function, every pattern exists because someone made a decision with context we've often lost. GYWD makes those decisions explicit and queryable."

**v1.x** was feature accumulation.
**v2.0** was unified intelligence.
**v3.0** is the sophisticated brain - learning, adapting, predicting.
**v3.2** is enhanced learning - cross-project memory, team sharing, Bayesian confidence.

The paradigm shift: Instead of generating "plausible code," GYWD generates **decision-coherent code** that respects the WHY behind your codebase and understands YOU as a developer.

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

**Commands run but nothing happens?**
- Check `.planning/` directory exists
- Run `/gywd:init` if missing

**Plan execution stuck?**
- Run `/gywd:progress` to see current state
- Check `.planning/STATE.md` for position

**Lost context mid-session?**
- Run `/gywd:resume-work` to restore
- Or `/gywd:progress` to see what's next

**JSON parse errors?**
- Check for syntax errors in `.planning/*.json` files
- Validate with `npm run validate:all`

**Permission denied errors?**
- Ensure write access to `.planning/` directory
- Check `~/.gywd/` is writable (for global memory)

**Need latest version?**
```bash
npx pmp-gywd@latest
```

---

## Contributing

Issues and PRs welcome at [github.com/cyberbloke9/pmp-gywd](https://github.com/cyberbloke9/pmp-gywd).

Before submitting:
- Run `npm test` (557 tests must pass)
- Run `npm run lint`

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for full guidelines.

---

## License

MIT License - See [LICENSE](LICENSE)

---

<div align="center">

**Understand decisions. Ship coherent code.**

*Built with decision intelligence by [cyberbloke9](https://github.com/cyberbloke9)*

</div>
