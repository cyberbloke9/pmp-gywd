<div align="center">

# PMP - GYWD (Get Your Work Done)

**Ship faster with AI that remembers your decisions.**

*The connected context engineering framework for Claude Code — 47 commands · 1,299 tests · 49 lib modules · Zero runtime deps*

[![Version](https://img.shields.io/badge/version-5.0.0-blue?style=for-the-badge)](https://github.com/cyberbloke9/pmp-gywd/releases)
[![Tests](https://img.shields.io/badge/tests-1%2C299%20passing-brightgreen?style=for-the-badge)](https://github.com/cyberbloke9/pmp-gywd/actions)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

<br>

```bash
npx pmp-gywd
```

**Cross-platform: Windows, Mac, Linux**

</div>

---

## What's New in v5.0?

**Connected Intelligence** — Web dashboard, semantic memory, multi-model LLMs, CRDT collaboration, enterprise security, and CI/CD integration.

| Feature | Description |
|---------|-------------|
| **Web Dashboard** | Next.js 14 planning dashboard with real-time SSE, charts, and analytics |
| **API Gateway** | Express REST + WebSocket API with auth and rate limiting |
| **Semantic Memory** | Zero-dep TF-IDF embeddings for context-aware search and decision similarity |
| **Multi-Model** | Provider-agnostic LLM adapters (OpenAI, Google, Local) with smart routing |
| **CRDT Collaboration** | Multi-user plan editing, decision voting, conflict resolution |
| **Enterprise** | SSO (OIDC/SAML), RBAC, audit logging, SOC2/GDPR compliance |
| **CI/CD Integration** | Pre-merge validation, release notes generation, GitHub/GitLab templates |

```
          v5.0 Connected Intelligence
┌─────────────────────────────────────────────────┐
│  Web Dashboard    API Gateway    CI/CD Pipeline  │
│  (Next.js 14)    (Express+WS)   (GH Actions)   │
│       │              │              │            │
│       └──────────────┼──────────────┘            │
│                      ▼                           │
│  ┌───────────────────────────────────────────┐  │
│  │         v5.0 Connected Layer              │  │
│  │  Semantic · Models · CRDT · Enterprise    │  │
│  └─────────────────────┬─────────────────────┘  │
│                        │                         │
│  ┌─────────────────────┴─────────────────────┐  │
│  │         v4.0 Agent Runtime                │  │
│  │  Critic · Red Team · Chaos · Skeptic      │  │
│  └─────────────────────┬─────────────────────┘  │
│                        │                         │
│  ┌─────────────────────┴─────────────────────┐  │
│  │         v3.0 Brain + v3.2 Memory          │  │
│  │  Profile · Questioning · GlobalMemory     │  │
│  └─────────────────────┬─────────────────────┘  │
│                        │                         │
│  ┌─────────────────────┴─────────────────────┐  │
│  │         Plugin System (47 commands)        │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

<details>
<summary><b>Previous versions</b></summary>

### v4.0: Autonomous Intelligence
Agent Runtime (6 agents), Permission Scanner, Analytics Agents, Self-Grilling, Multi-Agent Coordination, Plugin System, Visual Dashboard

### v3.4: Enhanced Experience
MetadataCache, KeywordIndex, graph persistence, VS Code extension, MCP Server

### v3.2: Enhanced Learning
GlobalMemory, PatternAggregator, FeedbackCollector, ConfidenceCalibrator, TeamSync

</details>

*See [CHANGELOG.md](CHANGELOG.md) for full version history. See [MIGRATION.md](MIGRATION.md) for upgrade guide.*

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

*See `/gywd:help` for all 47 commands*

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

## Library Modules

```javascript
// Semantic Memory (v5.0)
const { Embedder, SemanticSearch, ContextInjector, DecisionSimilarity } = require('pmp-gywd/lib/semantic');

// Multi-Model LLM (v5.0)
const { OpenAIAdapter, GoogleAdapter, LocalAdapter, ModelRouter } = require('pmp-gywd/lib/models');

// CRDT Collaboration (v5.0)
const { GCounter, PNCounter, LWWRegister, ORSet, PlanEditor, DecisionVoting, ConflictResolver } = require('pmp-gywd/lib/crdt');

// Enterprise (v5.0)
const { SSOManager, RBAC, AuditLog, ComplianceReporter } = require('pmp-gywd/lib/enterprise');

// CI/CD (v5.0)
const { PreMergeValidator, ReleaseNotesGenerator, CIRunner } = require('pmp-gywd/lib/ci');

// Agents (v4.0)
const { CriticAgent, RedTeamAgent, AgentOrchestrator } = require('pmp-gywd/lib/agents');

// Permissions (v4.0)
const { PermissionRouter, RiskScorer } = require('pmp-gywd/lib/permissions');

// Analytics (v4.0)
const { ModelGeneratorAgent, ReviewAgent } = require('pmp-gywd/lib/analytics');

// Memory (v3.2)
const { GlobalMemory, PatternAggregator, TeamSync } = require('pmp-gywd/lib/memory');

// Context & Automation
const { ContextPredictor } = require('pmp-gywd/lib/context');
const { DependencyAnalyzer } = require('pmp-gywd/lib/automation');
```

**49 modules** · **Zero runtime dependencies** · Works offline

---

## Architecture (v5.0)

```
┌─────────────────────────────────────────────────────────┐
│                    GYWD v5.0 Core                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │       Web Dashboard · API Gateway · CI/CD      │     │
│  │   (Next.js 14)    (Express+WS)   (GH/GitLab) │     │
│  └─────────────────────┬─────────────────────────┘     │
│                        │                               │
│  ┌─────────┬───────────┼───────────┬─────────┐        │
│  │Semantic │  Multi-   │   CRDT    │Enterpr- │        │
│  │ Memory  │  Model    │  Collab   │  ise    │        │
│  └────┬────┴─────┬─────┴─────┬─────┴────┬────┘        │
│       └──────────┴───────────┴──────────┘              │
│                        │                               │
│  ┌─────────────────────┴─────────────────────────┐    │
│  │           Agent Runtime (v4.0)                 │    │
│  │  Critic · Red Team · Chaos · Skeptic · Devil  │    │
│  └─────────────────────┬─────────────────────────┘    │
│                        │                               │
│  ┌─────────────────────┴─────────────────────────┐    │
│  │  Brain + Memory + Profile + Context             │    │
│  │  GlobalMemory · PatternAggregator · TeamSync   │    │
│  └─────────────────────┬─────────────────────────┘    │
│                        │                               │
│  ┌─────────────────────┴─────────────────────────┐    │
│  │       Plugin System + Command Layer (47)       │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## CI/CD Pipeline

- **12 test matrix combinations** (3 OS x 4 Node versions)
- **1,299 automated tests** with Jest (50 test suites)
- **GYWD pre-merge validation** — drift detection, decision conflicts, test health
- **ESLint** with zero external plugins
- **Schema/command validation** for all 47 commands
- **Security scanning** with npm audit
- **GitHub Actions** workflow with PR comments and artifact uploads
- **GitLab CI** template with reusable job definitions

```bash
npm run precommit    # Run all checks locally
npm test             # Run tests
npm run lint         # Run linter
npm run validate:all # Validate schemas and commands

# GYWD-specific CI checks
node lib/ci/ci-runner.js validate          # Pre-merge validation
node lib/ci/ci-runner.js release-notes     # Generate release notes
node lib/ci/ci-runner.js report            # Full CI report
```

---

## Philosophy

> "Code is crystallized decisions. Every function, every pattern exists because someone made a decision with context we've often lost. GYWD makes those decisions explicit and queryable."

**v1.x** was feature accumulation.
**v2.0** was unified intelligence.
**v3.0** is the sophisticated brain - learning, adapting, predicting.
**v3.4** is enhanced experience - performance, IDE integration, MCP server.
**v4.0** is autonomous intelligence - agents that challenge, validate, and protect.
**v5.0** is connected intelligence - web dashboard, multi-model LLMs, collaboration, enterprise, and CI/CD.

The paradigm shift: Instead of generating "plausible code," GYWD generates **decision-coherent code** that respects the WHY behind your codebase, understands YOU as a developer, **actively challenges assumptions**, and now connects across tools, models, and teams.

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
- Run `npm test` (1,299 tests must pass)
- Run `npm run lint`

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for full guidelines.

---

## License

MIT License - See [LICENSE](LICENSE)

---

<div align="center">

**Understand decisions. Challenge assumptions. Connect intelligence. Ship coherent code.**

*Built with connected intelligence by [cyberbloke9](https://github.com/cyberbloke9)*

</div>
