# Structure

## Directory Layout

```
PMP-GYWD/
├── .claude-plugin/           # Claude Code plugin metadata
│   ├── plugin.json           # Command registration (43 commands)
│   └── marketplace.json      # Marketplace listing
│
├── .github/                  # GitHub configuration
│   └── workflows/
│       ├── ci.yml            # Multi-platform testing
│       └── release.yml       # NPM publishing
│
├── bin/                      # Installation
│   └── install.js            # NPM installer
│
├── commands/                 # User-facing commands
│   └── gywd/                 # 43 command files
│       ├── new-project.md
│       ├── create-roadmap.md
│       ├── map-codebase.md
│       ├── plan-phase.md
│       ├── execute-plan.md
│       ├── challenge.md
│       ├── undo.md
│       ├── compare.md
│       ├── snapshot.md
│       └── ... (34 more)
│
├── get-your-work-done/       # System knowledge base
│   ├── templates/            # Output formats (16 files)
│   │   ├── codebase/         # 7 analysis templates
│   │   ├── project.md
│   │   ├── roadmap.md
│   │   ├── state.md
│   │   └── ...
│   ├── workflows/            # Execution logic (14 files)
│   │   ├── execute-phase.md  # Core execution
│   │   ├── plan-phase.md
│   │   └── ...
│   └── references/           # Principles (9 files)
│       ├── principles.md
│       ├── questioning.md
│       └── ...
│
├── lib/                      # Library modules (20+)
│   ├── agents/               # v4.0 Agent Runtime
│   │   ├── base-agent.js
│   │   ├── agent-types.js
│   │   ├── agent-orchestrator.js
│   │   └── index.js
│   ├── analytics/            # v4.0 Analytics Agents
│   │   ├── model-generator.js
│   │   ├── test-generator.js
│   │   ├── review-agent.js
│   │   └── index.js
│   ├── automation/           # v3.0 Automation
│   │   ├── dependency-analyzer.js
│   │   ├── test-generator.js
│   │   └── doc-generator.js
│   ├── brain/                # v3.0 Brain Core
│   ├── cache/                # v3.4 Performance
│   │   └── metadata-cache.js
│   ├── cli/                  # v3.4 CLI UX
│   │   └── progress-indicator.js
│   ├── context/              # v3.0 Context
│   │   ├── context-analyzer.js
│   │   ├── context-predictor.js
│   │   └── context-cache.js
│   ├── dashboard/            # v4.0 Visual Dashboard
│   │   └── dashboard-renderer.js
│   ├── errors/               # v3.4 Error Handling
│   │   └── error-formatter.js
│   ├── gates/                # v3.4 Quality Gates
│   │   └── pr-gate.js
│   ├── grilling/             # v4.0 Self-Grilling
│   │   ├── plan-challenger.js
│   │   ├── change-validator.js
│   │   ├── decision-griller.js
│   │   └── index.js
│   ├── hooks/                # v3.4 Hook System
│   │   └── hook-manager.js
│   ├── index/                # v3.4 Indexing
│   │   └── keyword-index.js
│   ├── memory/               # v3.2 Memory
│   │   ├── global-memory.js
│   │   ├── pattern-aggregator.js
│   │   ├── feedback-collector.js
│   │   ├── confidence-calibrator.js
│   │   └── team-sync.js
│   ├── metrics/              # v3.4 Metrics
│   │   └── dashboard.js
│   ├── multi-agent/          # v4.0 Multi-Agent
│   │   ├── coordinator.js
│   │   ├── message-queue.js
│   │   ├── cloud-sync.js
│   │   └── team-sync.js
│   ├── permissions/          # v4.0 Permissions
│   │   ├── operation-classifier.js
│   │   ├── risk-scorer.js
│   │   ├── permission-router.js
│   │   └── index.js
│   ├── plugins/              # v4.0 Plugin System
│   │   ├── plugin-loader.js
│   │   ├── marketplace.js
│   │   └── index.js
│   ├── profile/              # v3.0 Profile
│   │   ├── profile-manager.js
│   │   └── pattern-learner.js
│   ├── questioning/          # v3.0 Questioning
│   │   └── question-engine.js
│   ├── sync/                 # v3.4 Sync
│   │   └── claude-md-generator.js
│   └── validators/           # v3.0 Validators
│       ├── schema-validator.js
│       ├── command-validator.js
│       └── workflow-validator.js
│
├── mcp-server/               # v3.4 MCP Server
│   ├── index.js              # Server entry point
│   └── package.json          # Server dependencies
│
├── vscode-extension/         # v3.4 VS Code Extension
│   ├── extension.js          # Extension entry point
│   └── package.json          # Extension manifest
│
├── tests/                    # 618 tests across 25 suites
│   ├── agents/               # Agent tests
│   ├── analytics/            # Analytics tests
│   ├── automation/           # Automation tests
│   ├── brain/                # Brain tests
│   ├── context/              # Context tests
│   ├── grilling/             # Grilling tests
│   ├── memory/               # Memory tests
│   ├── multi-agent/          # Multi-agent tests
│   ├── permissions/          # Permission tests
│   ├── plugins/              # Plugin tests
│   ├── profile/              # Profile tests
│   ├── questioning/          # Questioning tests
│   ├── validators/           # Validator tests
│   └── integration/          # Integration tests
│
├── docs/                     # Documentation
│   ├── GETTING-STARTED.md
│   ├── COMMANDS.md
│   ├── EXAMPLES.md
│   └── CONTRIBUTING.md
│
├── assets/                   # Documentation assets
├── LICENSE                   # MIT
├── package.json              # NPM metadata
├── CHANGELOG.md              # Version history
└── README.md                 # User documentation
```

## Generated Project Structure

When GYWD runs on a project, it creates:

```
project/
└── .planning/
    ├── PROJECT.md            # Vision and requirements
    ├── ROADMAP.md            # Phase breakdown
    ├── STATE.md              # Session memory
    ├── ISSUES.md             # Deferred items
    ├── config.json           # Workflow preferences
    ├── codebase/             # Analysis (brownfield)
    │   ├── STACK.md
    │   ├── ARCHITECTURE.md
    │   ├── STRUCTURE.md
    │   ├── CONVENTIONS.md
    │   ├── TESTING.md
    │   ├── INTEGRATIONS.md
    │   ├── CONCERNS.md
    │   └── DECISIONS.md
    └── phases/
        ├── 01-phase-name/
        │   ├── 01-01-PLAN.md
        │   └── 01-01-SUMMARY.md
        └── 02-phase-name/
            └── ...
```

## File Location Conventions

| File Type | Location |
|-----------|----------|
| Commands | `commands/gywd/{command-name}.md` |
| Workflows | `get-your-work-done/workflows/{workflow}.md` |
| Templates | `get-your-work-done/templates/{purpose}.md` |
| References | `get-your-work-done/references/{topic}.md` |
| Lib modules | `lib/{category}/{module}.js` |
| Tests | `tests/{category}/{module}.test.js` |
| Phase Plans | `.planning/phases/{N}-name/{N}-{M}-PLAN.md` |
| Phase Results | `.planning/phases/{N}-name/{N}-{M}-SUMMARY.md` |

## Naming Conventions

- **Directories**: kebab-case with numeric prefix for phases
- **Commands**: kebab-case (`new-project`, `execute-plan`)
- **Lib modules**: kebab-case.js (`base-agent.js`, `risk-scorer.js`)
- **Documents**: UPPER_CASE.md for core docs (PROJECT, ROADMAP, STATE)
- **Phases**: `{N:02d}-{name}/` with zero-padded numbers
- **Decimal phases**: `{N}.{M}-{name}/` for urgent insertions

---
*Last updated: 2026-02-01 - v4.0.0*
