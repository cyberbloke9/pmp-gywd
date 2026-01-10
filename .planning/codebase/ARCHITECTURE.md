# Architecture

## System Design Pattern

**Workflow-Driven CLI Architecture** with command-dispatch system for AI-assisted development.

```
User Command → Command Handler → Workflow Engine → Output Generation → Git Commit
                                      ↓
                              Load State/Context
                                      ↓
                              Apply Templates
```

## Three-Layer Architecture

### Layer 1: Command Interface
- Location: `commands/gywd/`
- 21 user-facing slash commands
- Each command is a markdown file with YAML frontmatter
- Defines objectives, allowed tools, execution context

### Layer 2: Workflow Engine
- Location: `get-your-work-done/workflows/`
- 14 workflow files defining execution logic
- Step-by-step processes with decision points
- References templates and principles

### Layer 3: Knowledge Base
- Location: `get-your-work-done/`
- **Templates** (16 files): Output document formats
- **References** (9 files): Guiding principles and patterns
- **Config**: Workflow preferences

## Data Flow

```
.planning/
├── PROJECT.md    ← Vision (always loaded)
├── ROADMAP.md    ← Phase breakdown
├── STATE.md      ← Session memory (quick digest)
├── config.json   ← Workflow mode
└── phases/
    └── XX-name/
        ├── XX-YY-PLAN.md     ← Executable prompt
        └── XX-YY-SUMMARY.md  ← Execution results
```

## Key Architectural Decisions

1. **Plans ARE Prompts** - PLAN.md files are executable prompts, not documents transformed into prompts

2. **State via Files** - Project state in `.planning/` directory enables session persistence without database

3. **Fresh Contexts** - Each plan executes in isolated subagent context (200k tokens) to prevent degradation

4. **Atomic Commits** - Each task commits immediately: `{type}({phase}-{plan}): {description}`

5. **Dual Modes** - Interactive (user confirmation) vs Autonomous (minimal intervention)

## Execution Strategies

| Strategy | Checkpoints | Behavior |
|----------|-------------|----------|
| A: Autonomous | None | Spawn subagent, run to completion |
| B: Segmented | Verify-only | Pause for human confirmation |
| C: Interactive | Decision | Human input affects subsequent tasks |
