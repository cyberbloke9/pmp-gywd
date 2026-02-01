# PROJECT: PMP-GYWD

## What This Is

An autonomous context engineering framework for Claude Code that transforms how developers work with AI. PMP-GYWD provides 43 commands for project lifecycle management — from initialization through planning, execution, verification, and continuous learning. In v4.0, it gained autonomous intelligence with executable agents, permission scanning, and self-validation.

## Core Value

Enable developers to ship faster with AI by providing structured workflows, persistent context, adaptive learning, and autonomous agents — so Claude understands your project, your patterns, and your preferences across sessions while actively challenging assumptions before they become problems.

## Requirements

### Validated

- ✅ **Naming standardization** — GYWD branding throughout (v1.1.0)
- ✅ **Error handling** — Robust install.js with user-friendly errors (v1.1.0)
- ✅ **Test framework** — 618 Jest tests across 25 suites (v4.0.0)
- ✅ **43 GYWD commands** — Full project lifecycle coverage (v3.4.0)
- ✅ **Developer Digital Twin** — Profile learning and adaptation (v3.0.0)
- ✅ **Adaptive questioning** — Context-aware question optimization (v3.0.0)
- ✅ **Context prediction** — Intelligent file relationship analysis (v3.0.0)
- ✅ **Cross-project memory** — Pattern persistence across projects (v3.2.0)
- ✅ **Pattern aggregation** — Consensus detection and outlier identification (v3.2.0)
- ✅ **Feedback collection** — Suggestion outcome tracking (v3.2.0)
- ✅ **Bayesian calibration** — Statistically rigorous confidence scoring (v3.2.0)
- ✅ **Team sync** — Pattern sharing with conflict resolution (v3.2.0)
- ✅ **Automation framework** — Dependency, test, doc generators (v3.0.0)
- ✅ **Validation framework** — Schema, command, workflow validators (v3.0.0)
- ✅ **CI/CD pipeline** — GitHub Actions with multi-platform testing (v3.0.0)
- ✅ **Performance optimization** — MetadataCache, KeywordIndex, graph persistence (v3.4.0)
- ✅ **VS Code extension** — Status bar, file watcher, 6 commands (v3.4.0)
- ✅ **MCP server** — Claude Desktop integration with 4 tools (v3.4.0)
- ✅ **Developer UX** — ErrorFormatter, ProgressIndicator, HookManager (v3.4.0)
- ✅ **Agent Runtime** — 6 specialized agents with orchestration (v4.0.0)
- ✅ **Permission Scanner** — Auto-approve safe, route dangerous to user (v4.0.0)
- ✅ **Analytics Agents** — Model, test, review generators (v4.0.0)
- ✅ **Self-Grilling** — Plan challenger, change validator, decision griller (v4.0.0)
- ✅ **Multi-Agent Coordination** — Consensus, majority, leader modes (v4.0.0)
- ✅ **Plugin System** — Load custom plugins, marketplace integration (v4.0.0)
- ✅ **Visual Dashboard** — ASCII charts, metrics, activity feeds (v4.0.0)

### Active

(No active requirements — v4.0 milestone complete)

### Out of Scope (Moved to v5.0+ Considerations)

- Web UI/dashboard — CLI-first design (ASCII dashboard added in v4.0)
- Multi-user real-time collaboration — Team sync is async via exports
- Cloud hosting — Managed GYWD service

## Context

### Technical Environment
- **Runtime:** Node.js >=16.7.0
- **Dependencies:** Zero runtime dependencies (dev deps for testing only)
- **Platform:** Cross-platform (Windows, macOS, Linux)
- **Testing:** Jest with 618 tests, 80%+ coverage target

### Architecture
```
PMP-GYWD/
├── bin/              # CLI entry point
├── commands/gywd/    # 43 command definitions
├── get-your-work-done/
│   ├── core/         # System architecture schemas
│   ├── references/   # Principles, guides, best practices
│   ├── templates/    # PROJECT.md, PLAN.md, etc.
│   └── workflows/    # Execution workflows
├── lib/
│   ├── agents/       # Agent runtime (Critic, RedTeam, Chaos, etc.)
│   ├── analytics/    # Model, test, review generators
│   ├── automation/   # Dependency, test, doc generators
│   ├── brain/        # Core brain orchestration
│   ├── cache/        # MetadataCache for performance
│   ├── cli/          # ProgressIndicator, TaskRunner
│   ├── context/      # Context analyzer, predictor, cache
│   ├── dashboard/    # DashboardRenderer with ASCII charts
│   ├── errors/       # ErrorFormatter with patterns
│   ├── gates/        # PRGate quality checks
│   ├── grilling/     # Plan challenger, change validator
│   ├── hooks/        # HookManager for pre/post hooks
│   ├── index/        # KeywordIndex for O(1) lookups
│   ├── memory/       # Global memory, patterns, team sync
│   ├── metrics/      # MetricsDashboard
│   ├── multi-agent/  # Coordinator, MessageQueue, CloudSync
│   ├── permissions/  # OperationClassifier, RiskScorer, Router
│   ├── plugins/      # PluginLoader, Marketplace
│   ├── profile/      # Developer Digital Twin
│   ├── questioning/  # Adaptive questioning engine
│   ├── sync/         # ClaudeMdGenerator
│   └── validators/   # Schema, command, workflow validators
├── mcp-server/       # MCP server for Claude Desktop
├── vscode-extension/ # VS Code extension
└── tests/            # 618 tests across 25 suites
```

### Version History
| Version | Focus | Status |
|---------|-------|--------|
| v1.0.0 | Foundation | ✅ |
| v1.1.0 | Polish (error handling, tests) | ✅ |
| v1.2.0 | Core features (memory, drift, deps) | ✅ |
| v1.3.0 | Differentiators (digest, rollback, GitHub) | ✅ |
| v1.4.0 | Decision Intelligence | ✅ |
| v2.0.0 | Unified Intelligence System | ✅ |
| v3.0.0 | Sophisticated Brain + Automation | ✅ |
| v3.2.0 | Enhanced Learning System | ✅ |
| v3.3.0 | Polish, Docs & Stability | ✅ |
| v3.4.0 | Enhanced Experience | ✅ |
| v4.0.0 | Autonomous Intelligence | ✅ |

## Constraints

- **Zero runtime deps** — install.js must work standalone
- **Cross-platform** — Windows, macOS, Linux support
- **Backward compatibility** — Don't break existing .planning/ structures
- **Dev deps OK** — Jest, ESLint for development only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Jest for testing | Industry standard, good Windows support | ✅ Good |
| Zero runtime deps | Lightweight install, no node_modules at runtime | ✅ Good |
| GYWD naming | Professional, distinct from original fork | ✅ Good |
| Modular lib architecture | Testability, separation of concerns | ✅ Good |
| Bayesian confidence | Statistically sound pattern learning | ✅ Good |
| Git-based persistence | No infrastructure, version controlled | ✅ Good |
| Team sync via exports | Async collaboration, no real-time complexity | ✅ Good |
| Agent pattern | Composable autonomous operations | ✅ Good |
| Plugin system | Extensibility without core modifications | ✅ Good |
| ASCII dashboard | Terminal-native, no browser dependency | ✅ Good |

---
*Last updated: 2026-02-01 - v4.0.0 Released*
