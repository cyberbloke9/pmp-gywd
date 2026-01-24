# PROJECT: PMP-GYWD

## What This Is

A context engineering framework for Claude Code that transforms how developers work with AI. PMP-GYWD provides 40 commands for project lifecycle management — from initialization through planning, execution, verification, and continuous learning. It's the meta-layer that makes Claude Code understand your project deeply.

## Core Value

Enable developers to ship faster with AI by providing structured workflows, persistent context, and adaptive learning — so Claude understands your project, your patterns, and your preferences across sessions.

## Requirements

### Validated

- ✅ **Naming standardization** — GYWD branding throughout (v1.1.0)
- ✅ **Error handling** — Robust install.js with user-friendly errors (v1.1.0)
- ✅ **Test framework** — 557 Jest tests across 22 suites (v3.2.0)
- ✅ **40 GYWD commands** — Full project lifecycle coverage (v2.0.0)
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

### Active

(No active requirements — milestone complete)

### Out of Scope

- Web UI/dashboard — CLI-first design
- VS Code extension — Separate project if pursued
- Multi-user collaboration (real-time) — Team sync is async via exports
- Cloud sync — Git-based persistence instead
- npm package publishing — GitHub install first

## Context

### Technical Environment
- **Runtime:** Node.js >=16.7.0
- **Dependencies:** Zero runtime dependencies (dev deps for testing only)
- **Platform:** Cross-platform (Windows, macOS, Linux)
- **Testing:** Jest with 80%+ coverage target

### Architecture
```
PMP-GYWD/
├── bin/              # CLI entry point
├── commands/gywd/    # 40 command definitions
├── get-your-work-done/
│   ├── core/         # System architecture schemas
│   ├── references/   # Principles, guides, best practices
│   ├── templates/    # PROJECT.md, PLAN.md, etc.
│   └── workflows/    # Execution workflows
├── lib/
│   ├── automation/   # Dependency, test, doc generators
│   ├── brain/        # Core brain orchestration
│   ├── context/      # Context analyzer, predictor, cache
│   ├── memory/       # Global memory, patterns, team sync
│   ├── profile/      # Developer Digital Twin
│   ├── questioning/  # Adaptive questioning engine
│   └── validators/   # Schema, command, workflow validators
└── tests/            # 557 tests across 22 suites
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

---
*Last updated: 2026-01-24 after state sync*
