# Integrations

## Primary Integration: Claude Code

### Plugin System
- Registers 43 commands via `.claude-plugin/plugin.json`
- Commands installed to `~/.claude/commands/gywd/` (global) or `./.claude/commands/gywd/` (local)
- Invoked via `/gywd:{command-name}` syntax

### Command Categories

| Category | Commands |
|----------|----------|
| Setup | `new-project`, `bootstrap`, `create-roadmap`, `map-codebase`, `init` |
| Planning | `plan-phase`, `discuss-phase`, `research-phase`, `list-phase-assumptions`, `anticipate` |
| Execution | `execute-plan`, `preview-plan`, `verify-work`, `plan-fix` |
| Progress | `progress`, `status`, `pause-work`, `resume-work` |
| Roadmap | `add-phase`, `insert-phase`, `remove-phase` |
| Milestones | `complete-milestone`, `discuss-milestone`, `new-milestone` |
| Version Control | `undo`, `compare`, `snapshot`, `rollback` |
| Intelligence | `challenge`, `why`, `history`, `check-drift`, `extract-decisions` |
| Context | `context`, `digest`, `memory`, `profile`, `impact` |
| Utilities | `consider-issues`, `deps`, `health`, `sync-github`, `help` |

## VS Code Extension (v3.4)

### Location
`vscode-extension/`

### Features
- **Status Bar** - Shows current phase and focus
- **File Watcher** - Monitors `.planning/` directory changes
- **6 Commands**:
  - `gywd.progress` - Show progress
  - `gywd.status` - Quick status
  - `gywd.planPhase` - Plan current phase
  - `gywd.executePhase` - Execute plan
  - `gywd.verifyWork` - Verify implementation
  - `gywd.createPhase` - Add new phase

### Activation
Activated when `.planning/` folder is present in workspace.

## MCP Server (v3.4)

### Location
`mcp-server/`

### Tools Exposed
| Tool | Description |
|------|-------------|
| `get_status` | Get project status from STATE.md |
| `get_roadmap` | Get roadmap from ROADMAP.md |
| `get_context` | Get context from PROJECT.md |
| `search_files` | Search files in .planning/ |

### Resources Exposed
- `state` - Current project state
- `roadmap` - Phase breakdown
- `issues` - Deferred issues

### Transport
Stdio transport for Claude Desktop integration.

## File System Integration

### Directory Management
```
~/.claude/              # Global install location
  ├── commands/gywd/    # 43 command files
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

## Plugin System Integration (v4.0)

### Plugin Loader
- Location: `lib/plugins/plugin-loader.js`
- Sandboxed plugin execution
- Hook registration for pre/post events

### Plugin Marketplace
- Location: `lib/plugins/marketplace.js`
- Search, browse, install, update plugins
- Categories: productivity, integration, analytics, theme, agent, utility

### Plugin Types
| Type | Description |
|------|-------------|
| command | Custom commands |
| agent | Custom agent types |
| hook | Pre/post event handlers |
| theme | Dashboard themes |
| integration | External service integrations |

## Multi-Agent Integration (v4.0)

### Cloud Sync
- Location: `lib/multi-agent/cloud-sync.js`
- Remote state storage with versioned sync
- Conflict resolution strategies: local_wins, remote_wins, merge, manual

### Team Sync
- Location: `lib/multi-agent/team-sync.js`
- Real-time pattern sharing
- Decision voting
- Activity feeds

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CONFIG_DIR` | Custom Claude config directory override |
| `GYWD_PLUGIN_DIR` | Custom plugin directory |
| `GYWD_CLOUD_ENDPOINT` | Cloud sync endpoint |

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
| macOS | ✅ Supported |
| Linux | ✅ Supported |
| Windows | ✅ Supported |

## External Dependencies

**Runtime:** None - Pure Node.js built-ins only

**Dev Dependencies:**
- `jest` - Testing
- `eslint` - Linting

---
*Last updated: 2026-02-01 - v4.0.0*
