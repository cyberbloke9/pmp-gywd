<div align="center">

# PMP - GYWD (Get Your Work Done)

**Ship faster with AI that remembers your decisions.**

*The autonomous context engineering framework for Claude Code — 43 commands · 618 tests · 20+ lib modules · Zero runtime deps*

[![Version](https://img.shields.io/badge/version-4.0.0-blue?style=for-the-badge)](https://github.com/cyberbloke9/pmp-gywd/releases)
[![Tests](https://img.shields.io/badge/tests-618%20passing-brightgreen?style=for-the-badge)](https://github.com/cyberbloke9/pmp-gywd/actions)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

<br>

```bash
npx pmp-gywd
```

**Cross-platform: Windows, Mac, Linux**

</div>

---

## What's New in v4.0?

**Autonomous Intelligence** — Executable agents, permission scanning, and self-validation.

| Feature | Description |
|---------|-------------|
| **Agent Runtime** | 6 specialized agents (Critic, Devil's Advocate, Red Team, Chaos, Skeptic) |
| **Permission Scanner** | Auto-approve safe operations, block dangerous ones |
| **Analytics Agents** | dbt-style model, test, and review generators |
| **Self-Grilling** | Plan challenger, change validator, decision griller |
| **Multi-Agent** | Coordination, messaging, conflict resolution |
| **Plugin System** | Load custom plugins, marketplace integration |
| **Visual Dashboard** | ASCII charts, metrics, activity feeds |

```
          v4.0 Autonomous Intelligence
┌─────────────────────────────────────────────────┐
│  Agent Runtime                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Critic  │ │Red Team │ │  Chaos  │           │
│  └────┬────┘ └────┬────┘ └────┬────┘           │
│       └──────────┬┴──────────┘                 │
│                  ▼                              │
│           AgentOrchestrator                     │
│    (sequential/parallel/priority/pipeline)      │
│                  │                              │
│       ┌──────────┼──────────┐                  │
│       ▼          ▼          ▼                  │
│  Permission   Self-      Analytics             │
│   Scanner    Grilling     Agents               │
│       │          │          │                  │
│       └──────────┼──────────┘                  │
│                  ▼                              │
│           Plugin System                         │
│         + Visual Dashboard                      │
└─────────────────────────────────────────────────┘
```

---

### v3.4: Enhanced Experience

| Feature | Description |
|---------|-------------|
| **Performance** | MetadataCache, KeywordIndex, graph persistence |
| **New Commands** | `/gywd:undo`, `/gywd:compare`, `/gywd:snapshot` |
| **VS Code** | Extension with status bar integration |
| **MCP Server** | Claude Desktop integration |
| **Developer UX** | ErrorFormatter, ProgressIndicator, HookManager |

### v3.2: Enhanced Learning System

| Module | What It Does |
|--------|--------------|
| **GlobalMemory** | Persist patterns across projects in `~/.gywd/global/` |
| **PatternAggregator** | Detect consensus, identify outliers, Bayesian boosting |
| **FeedbackCollector** | Track suggestion outcomes, detect suppression |
| **ConfidenceCalibrator** | Beta-Binomial Bayesian confidence scoring |
| **TeamSync** | Export/import patterns with conflict resolution |

*See [CHANGELOG.md](CHANGELOG.md) for full version history.*

---

## What is GYWD?

**The problem:** AI generates code that conflicts with your existing decisions, forgets context between sessions, and degrades as projects grow.

**The solution:** GYWD builds a decision graph of your codebase, maintains persistent context, and now includes autonomous agents that validate, review, and challenge your work.

| Challenge | How GYWD Solves It |
|-----------|-------------------|
| Lost context between sessions | Decision graph + persistent memory |
| AI conflicts with architecture | Checks new code against existing decisions |
| "Why was this built this way?" | `/gywd:why` traces code to decisions |
| Unchallenged assumptions | Self-grilling agents question plans |
| Security blind spots | Red Team agent probes vulnerabilities |

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

*See `/gywd:help` for all 43 commands*

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

## Library Modules (v4.0)

```javascript
// Agents (v4.0)
const { CriticAgent, RedTeamAgent, AgentOrchestrator } = require('pmp-gywd/lib/agents');

// Permissions (v4.0)
const { PermissionRouter, RiskScorer } = require('pmp-gywd/lib/permissions');

// Analytics (v4.0)
const { ModelGeneratorAgent, ReviewAgent } = require('pmp-gywd/lib/analytics');

// Self-Grilling (v4.0)
const { PlanChallengerAgent, DecisionGrillerAgent } = require('pmp-gywd/lib/grilling');

// Multi-Agent (v4.0)
const { MultiAgentCoordinator, MessageQueue } = require('pmp-gywd/lib/multi-agent');

// Plugins (v4.0)
const { PluginLoader, PluginMarketplace } = require('pmp-gywd/lib/plugins');

// Dashboard (v4.0)
const { DashboardRenderer } = require('pmp-gywd/lib/dashboard');

// Memory (v3.2)
const { GlobalMemory, PatternAggregator, TeamSync } = require('pmp-gywd/lib/memory');

// Profile & Questioning
const { ProfileManager } = require('pmp-gywd/lib/profile');
const { QuestionEngine } = require('pmp-gywd/lib/questioning');

// Context & Automation
const { ContextPredictor } = require('pmp-gywd/lib/context');
const { DependencyAnalyzer } = require('pmp-gywd/lib/automation');
```

**20+ modules** · **Zero runtime dependencies** · Works offline

---

## Architecture (v4.0)

```
┌─────────────────────────────────────────────────────────┐
│                    GYWD v4.0 Core                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │            Agent Runtime (v4.0)                │     │
│  │  Critic · Red Team · Chaos · Skeptic · Devil  │     │
│  │            AgentOrchestrator                   │     │
│  └─────────────────────┬─────────────────────────┘     │
│                        │                               │
│  ┌─────────┬───────────┼───────────┬─────────┐        │
│  │Permission│  Self-    │  Analytics │  Multi- │        │
│  │ Scanner │ Grilling  │   Agents  │  Agent  │        │
│  └────┬────┴─────┬─────┴─────┬─────┴────┬────┘        │
│       └──────────┴───────────┴──────────┘              │
│                        │                               │
│  ┌─────────────────────┴─────────────────────────┐    │
│  │              v3.0 Brain                        │    │
│  │  Profile ◄──► Questioning ──► Predictor       │    │
│  │            Continuous Learning                 │    │
│  └─────────────────────┬─────────────────────────┘    │
│                        │                               │
│  ┌─────────────────────┴─────────────────────────┐    │
│  │           v3.2 Memory Module                  │    │
│  │  GlobalMemory · PatternAggregator · TeamSync  │    │
│  └─────────────────────┬─────────────────────────┘    │
│                        │                               │
│  ┌─────────────────────┴─────────────────────────┐    │
│  │     Plugin System + Visual Dashboard           │    │
│  └─────────────────────┬─────────────────────────┘    │
│                        │                               │
│  ┌─────────────────────┴─────────────────────────┐    │
│  │            Command Layer (43)                  │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## CI/CD Pipeline

- **12 test matrix combinations** (3 OS x 4 Node versions)
- **618 automated tests** with Jest (25 test suites)
- **ESLint** with zero external plugins
- **Schema validation** for all JSON files
- **Command validation** for all 43 commands
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
**v3.4** is enhanced experience - performance, IDE integration, MCP server.
**v4.0** is autonomous intelligence - agents that challenge, validate, and protect.

The paradigm shift: Instead of generating "plausible code," GYWD generates **decision-coherent code** that respects the WHY behind your codebase, understands YOU as a developer, and **actively challenges assumptions** before they become problems.

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

**Need latest version?**
```bash
npx pmp-gywd@latest
```

---

## Contributing

Issues and PRs welcome at [github.com/cyberbloke9/pmp-gywd](https://github.com/cyberbloke9/pmp-gywd).

Before submitting:
- Run `npm test` (618 tests must pass)
- Run `npm run lint`

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for full guidelines.

---

## License

MIT License - See [LICENSE](LICENSE)

---

<div align="center">

**Understand decisions. Challenge assumptions. Ship coherent code.**

*Built with autonomous intelligence by [cyberbloke9](https://github.com/cyberbloke9)*

</div>
