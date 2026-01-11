<div align="center">

# PMP - GYWD (Get Your Work Done)

**Decision-aware, context-engineered development for Claude Code.**

*Code is crystallized decisions. GYWD understands WHY code exists, not just WHAT it does.*

[![Version](https://img.shields.io/badge/version-3.0.0--dev-blue?style=for-the-badge)](https://github.com/cyberbloke9/pmp-gywd/releases)
[![Tests](https://img.shields.io/badge/tests-253%20passing-brightgreen?style=for-the-badge)](https://github.com/cyberbloke9/pmp-gywd/actions)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

<br>

```bash
npx pmp-gywd
```

**Cross-platform: Windows, Mac, Linux**

</div>

---

## What's New in v3.0?

v3.0 introduces the **Sophisticated Brain** - a collection of intelligent engines that learn and adapt to your development patterns.

| Engine | Purpose | Status |
|--------|---------|--------|
| **Validation Framework** | Schema & command validation with zero dependencies | Complete |
| **Profile Engine** | Developer Digital Twin - learns your patterns | Complete |
| **Questioning Engine** | Adaptive questions that skip what's already known | Complete |
| **Context Predictor** | Pre-loads relevant context before you ask | Complete |
| **Industry Module** | Healthcare, Fintech, Gaming, E-commerce templates | Planned |
| **Automation Framework** | Dependency analysis, test generation | Planned |

### The Sophisticated Brain

```
                    ┌───────────────────────────────────────────────┐
                    │              GYWD v3.0 Brain                   │
                    ├───────────────────────────────────────────────┤
                    │                                               │
  Questions ───────►│  ┌─────────────┐  ┌─────────────┐            │
                    │  │  Profile    │  │ Questioning │            │
                    │  │  Engine     │◄─┤   Engine    │            │
                    │  └──────┬──────┘  └──────┬──────┘            │
                    │         │                │                    │
                    │         ▼                ▼                    │
                    │  ┌────────────────────────────────────┐      │
                    │  │         Context Predictor          │      │
  Workflow ────────►│  │  ┌──────────┐ ┌──────────────────┐│      │────► Predictions
                    │  │  │ Analyzer │ │  Access Pattern  ││      │
                    │  │  │  (Graph) │ │  (Co-occurrence) ││      │
                    │  │  └──────────┘ └──────────────────┘│      │
                    │  └──────────────────┬─────────────────┘      │
                    │                     │                        │
                    │         ┌───────────▼───────────┐            │
  Learning ────────►│         │    LRU Context Cache  │            │────► Decisions
                    │         └───────────────────────┘            │
                    │                                               │
                    └───────────────────────────────────────────────┘
```

**Profile Engine** learns:
- Cognitive fingerprint (problem approach, debugging style)
- Communication preferences (verbosity, formality)
- Tool preferences (languages, frameworks, patterns)
- Domain expertise areas
- Quality standards (testing, documentation)

**Questioning Engine** provides:
- Context-aware questions that adapt to expertise
- Skip questions when knowledge already exists
- Priority-based questioning (critical first)
- Follow-up generation based on answers

**Context Predictor** provides:
- Relationship graph (imports, same-dir, tests, co-access)
- Access pattern tracking with co-occurrence learning
- Task/file/feature-based context predictions
- LRU cache with TTL for efficient memory usage
- Session pattern analysis for predictive loading

---

## What is GYWD?

GYWD is a **unified intelligence system** that transforms AI-assisted development from "plausible text generation" to "decision-coherent engineering."

### The Problem

AI generates syntactically correct code that lacks **decision coherence**:
- Suggestions conflict with existing architectural decisions
- Context gets lost between sessions
- No understanding of WHY code exists
- Quality degrades as projects grow

### The Solution

GYWD builds a **decision graph** of your codebase and uses integrated systems:

| System | What It Does |
|--------|--------------|
| **Decision Graph Engine** | Extracts and links all decisions from history |
| **Context Intelligence** | Predicts what context you need before you ask |
| **Agent Orchestrator** | Coordinates specialized agents including adversarial reviewers |
| **Continuous Learning** | Improves with every interaction |
| **Profile Engine** | Learns your patterns and preferences (v3.0) |
| **Questioning Engine** | Asks smart questions, skips redundant ones (v3.0) |

---

## Getting Started

### Step 1: Install GYWD

```bash
npx pmp-gywd
```

Select **global** (available everywhere) or **local** (current project only).

### Step 2: Verify Installation

Open Claude Code and run:
```
/gywd:help
```

### Step 3: Choose Your Path

---

## Starting Fresh: New Idea, New Project

**You have an idea and want to build it from scratch.**

### What to Run

```bash
/gywd:new-project
```

### What Happens

GYWD conducts a guided interview to understand your vision:

1. **Discovery Phase** - GYWD asks about:
   - What problem you're solving
   - Who the users are
   - Core features needed
   - Technical preferences (language, framework, testing)
   - Quality standards and constraints

2. **Profile Creation** - Based on your answers, GYWD:
   - Creates `PROJECT.md` with your vision documented
   - Builds your developer profile (learns your patterns)
   - Records your preferences for future sessions

3. **Roadmap Generation** - Run `/gywd:create-roadmap` to:
   - Break your idea into manageable phases
   - Define clear milestones
   - Create `ROADMAP.md` with the full plan

4. **Start Building** - Run `/gywd:plan-phase 1` then `/gywd:execute-plan`:
   - Get detailed task breakdown for Phase 1
   - Execute with decision tracking
   - Every choice is recorded for future reference

### How It Helps You

| Challenge | How GYWD Solves It |
|-----------|-------------------|
| "Where do I start?" | Guided interview breaks your idea into phases |
| "I keep forgetting context" | All decisions stored in `.planning/` directory |
| "Code gets messy over time" | Decision graph maintains architectural coherence |
| "AI suggestions conflict" | GYWD checks new code against existing decisions |
| "I waste time re-explaining" | Your profile persists across sessions |

### Example Flow

```bash
# Day 1: Define your idea
/gywd:new-project          # Answer questions about your vision
/gywd:create-roadmap       # Generate phase breakdown

# Day 2: Start building
/gywd:plan-phase 1         # Plan first phase in detail
/gywd:execute-plan         # Build it with AI assistance

# Day 3+: Continue work
/gywd:progress             # See where you left off
/gywd:resume-work          # Restore full context
```

---

## Existing Codebase: Join or Enhance a Project

**You have an existing codebase and want GYWD to understand it.**

### What to Run

```bash
/gywd:bootstrap
```

### What Happens

GYWD analyzes your codebase and builds intelligence:

1. **Codebase Mapping** - GYWD scans and documents:
   - Technology stack (`STACK.md`)
   - Architecture patterns (`ARCHITECTURE.md`)
   - Project structure (`STRUCTURE.md`)
   - Coding conventions (`CONVENTIONS.md`)
   - Testing approach (`TESTING.md`)
   - External integrations (`INTEGRATIONS.md`)
   - Technical debt (`CONCERNS.md`)

2. **Decision Extraction** - From git history, GYWD:
   - Extracts WHY code exists (not just what)
   - Links decisions to specific files
   - Builds searchable decision graph (`decisions.json`)

3. **Context Model** - GYWD learns:
   - Which files relate to which features
   - Common patterns in your codebase
   - Predictive context loading

4. **Developer Profile** - As you work, GYWD learns:
   - Your coding style preferences
   - Your expertise areas
   - Your communication preferences

### How It Helps You

| Challenge | How GYWD Solves It |
|-----------|-------------------|
| "Why was this built this way?" | `/gywd:why <file>` traces to original decisions |
| "I'm new to this codebase" | Codebase docs explain everything |
| "Will this change break things?" | Decision graph shows dependencies |
| "What context do I need?" | `/gywd:anticipate` pre-loads relevant files |
| "Is my approach consistent?" | `/gywd:challenge` reviews against patterns |

### Example Flow

```bash
# First time: Understand the codebase
/gywd:bootstrap            # One command does everything

# Or step by step:
/gywd:map-codebase         # Analyze structure
/gywd:extract-decisions    # Build decision graph

# Daily work: Add new features
/gywd:new-project          # Define what you're adding
/gywd:create-roadmap       # Plan within existing architecture
/gywd:plan-phase 1         # Detailed task plan
/gywd:execute-plan         # Build with context awareness

# Understand existing code
/gywd:why src/auth/login.ts    # Why does this file exist?
/gywd:history "authentication" # How has auth evolved?
```

---

## Quick Reference: Which Command When?

| Situation | Command |
|-----------|---------|
| Brand new idea, starting fresh | `/gywd:new-project` |
| Existing codebase, first time using GYWD | `/gywd:bootstrap` |
| Starting work for the day | `/gywd:progress` |
| Returning after a break | `/gywd:resume-work` |
| Need to understand why code exists | `/gywd:why <file>` |
| Planning next feature | `/gywd:plan-phase` |
| Ready to build | `/gywd:execute-plan` |
| Want AI to review my plan | `/gywd:challenge` |
| Saving state before stopping | `/gywd:pause-work` |

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

## Command Reference (41 Commands)

### Intelligence

| Command | Purpose |
|---------|---------|
| `/gywd:bootstrap` | Initialize complete system on any codebase |
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

## Library Modules (v3.0)

GYWD v3.0 includes importable JavaScript modules:

```javascript
// Validation
const { validateJsonSyntax, validateCommandFile } = require('pmp-gywd/lib/validators');

// Profile Engine
const { ProfileManager, PatternLearner } = require('pmp-gywd/lib/profile');

// Questioning Engine
const { QuestionEngine, createQuestion, PRIORITY } = require('pmp-gywd/lib/questioning');

// Context Predictor
const {
  ContextAnalyzer,      // File relationship graph
  ContextPredictor,     // Prediction engine
  AccessPattern,        // Co-occurrence tracking
  LRUCache,             // Cache with TTL
  ContextCache,         // Multi-layer caching
  RELATIONSHIP_TYPES,   // imports, same_dir, tested_by, etc.
  CONFIDENCE            // HIGH, MEDIUM, LOW
} = require('pmp-gywd/lib/context');
```

### Zero Runtime Dependencies

All modules are written in pure Node.js with no external dependencies. This ensures:
- Fast installation
- No supply chain vulnerabilities
- Works offline
- Predictable behavior

---

## v3.0 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GYWD v3.0 Core                           │
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
│  ┌───────────────┼────────────────┼───────────────┐            │
│  │               ▼                ▼               │            │
│  │  ┌─────────────────┐  ┌─────────────────┐     │            │
│  │  │ Profile Engine  │  │Questioning Engine│     │  v3.0     │
│  │  │ (Digital Twin)  │  │ (Adaptive Q&A)  │     │  Brain    │
│  │  └────────┬────────┘  └────────┬────────┘     │            │
│  │           └──────────┬─────────┘              │            │
│  │                      ▼                        │            │
│  │        ┌─────────────────────────┐            │            │
│  │        │   Context Predictor     │            │            │
│  │        │  (Relationships, Cache) │            │            │
│  │        └────────────┬────────────┘            │            │
│  │                     ▼                         │            │
│  │         ┌───────────────────────┐             │            │
│  │         │   Continuous Learning │             │            │
│  │         └───────────────────────┘             │            │
│  └────────────────────────────────────────────────┘            │
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

## CI/CD Pipeline

v3.0 includes comprehensive CI/CD:

- **12 test matrix combinations** (3 OS x 4 Node versions)
- **253 automated tests** with Jest (10 test suites)
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
