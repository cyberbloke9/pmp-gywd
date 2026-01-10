# Structure

## Directory Layout

```
PMP-GYWD/
├── .claude-plugin/           # Claude Code plugin metadata
│   ├── plugin.json           # Command registration (21 commands)
│   └── marketplace.json      # Marketplace listing
│
├── bin/                      # Installation
│   └── install.js            # NPM installer (211 lines)
│
├── commands/                 # User-facing commands
│   └── gywd/                 # 21 command files
│       ├── new-project.md
│       ├── create-roadmap.md
│       ├── map-codebase.md
│       ├── plan-phase.md
│       ├── execute-plan.md
│       └── ... (16 more)
│
├── get-your-work-done/       # System knowledge base
│   ├── templates/            # Output formats (16 files)
│   │   ├── codebase/         # 7 analysis templates
│   │   ├── project.md
│   │   ├── roadmap.md
│   │   ├── state.md
│   │   └── ...
│   ├── workflows/            # Execution logic (14 files)
│   │   ├── execute-phase.md  # Core (49KB)
│   │   ├── plan-phase.md
│   │   └── ...
│   └── references/           # Principles (9 files)
│       ├── principles.md
│       ├── questioning.md
│       └── ...
│
├── assets/                   # Documentation assets
├── LICENSE                   # MIT
├── package.json              # NPM metadata
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
    │   └── CONCERNS.md
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
| Phase Plans | `.planning/phases/{N}-name/{N}-{M}-PLAN.md` |
| Phase Results | `.planning/phases/{N}-name/{N}-{M}-SUMMARY.md` |

## Naming Conventions

- **Directories**: kebab-case with numeric prefix for phases
- **Commands**: kebab-case (`new-project`, `execute-plan`)
- **Documents**: UPPER_CASE.md for core docs (PROJECT, ROADMAP, STATE)
- **Phases**: `{N:02d}-{name}/` with zero-padded numbers
- **Decimal phases**: `{N}.{M}-{name}/` for urgent insertions
