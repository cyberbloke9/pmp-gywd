# Integrations

## Primary Integration: Claude Code

### Plugin System
- Registers 21 commands via `.claude-plugin/plugin.json`
- Commands installed to `~/.claude/commands/gywd/` (global) or `./.claude/commands/gywd/` (local)
- Invoked via `/gywd:{command-name}` syntax

### Command Categories

| Category | Commands |
|----------|----------|
| Setup | `new-project`, `create-roadmap`, `map-codebase` |
| Planning | `plan-phase`, `discuss-phase`, `research-phase`, `list-phase-assumptions` |
| Execution | `execute-plan`, `verify-work`, `plan-fix` |
| Progress | `progress`, `pause-work`, `resume-work` |
| Roadmap | `add-phase`, `insert-phase`, `remove-phase` |
| Milestones | `complete-milestone`, `discuss-milestone`, `new-milestone` |
| Utilities | `consider-issues`, `help` |

## File System Integration

### Directory Management
```
~/.claude/              # Global install location
  ├── commands/gywd/    # Command files
  └── get-your-work-done/  # Skill files

./.claude/              # Local install location
  └── (same structure)

.planning/              # Project artifacts (created per-project)
```

### File Operations
- Recursive directory copying with path replacement
- Markdown file processing for variable substitution
- JSON configuration creation

## Git Integration

### Automatic Operations
- `git init` - Repository initialization if not present
- `git add` - Stage changes per task
- `git commit` - Atomic commits after each task

### Commit Strategy
```
{type}({phase}-{plan}): {task-name}

Types: feat, fix, test, refactor, perf, chore, docs
```

### Metadata Commits
Separate commits for SUMMARY.md + STATE.md + ROADMAP.md updates after plan completion.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CONFIG_DIR` | Custom Claude config directory override |

## Installation Methods

```bash
# Global (all projects)
npx pmp-gywd --global

# Local (current project)
npx pmp-gywd --local

# Custom directory
npx pmp-gywd --global --config-dir ~/.claude-custom

# Via environment
CLAUDE_CONFIG_DIR=~/.claude-custom npx pmp-gywd --global
```

## Platform Support

| Platform | Status |
|----------|--------|
| macOS | Supported |
| Linux | Supported |
| Windows | Supported (via Node.js path handling) |

## External Dependencies

**None** - Pure Node.js built-ins only:
- `fs` - File operations
- `path` - Path handling
- `os` - Platform detection
- `readline` - Interactive prompts
