# PMP-GYWD Project Context

**Last Updated:** 2026-02-04
**Version:** 4.0.0

## What This Is

PMP-GYWD (Get Your Work Done) is a decision-aware development system for Claude Code. It provides structured project management, phase-based planning, and intelligent context management.

## Recent Work: Claude-Mem Integration

### What Was Built

A complete integration between GYWD and [claude-mem](https://github.com/thedotmack/claude-mem) for persistent cross-session memory.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code                          │
│  ┌─────────────────┐    ┌────────────────────────────┐ │
│  │  GYWD Skills    │    │  Plugin System             │ │
│  │  /gywd:mem-*    │    │  initPluginSystem()        │ │
│  └────────┬────────┘    └────────────┬───────────────┘ │
└───────────┼──────────────────────────┼─────────────────┘
            │                          │
            ▼                          ▼
┌───────────────────────┐    ┌─────────────────────────┐
│  claude-mem Worker    │◄───│  SSE Client             │
│  localhost:37777      │    │  Real-time streaming    │
│  ┌─────────────────┐  │    └─────────────────────────┘
│  │ SQLite + Chroma │  │              │
│  │ Vector DB       │  │              ▼
│  └─────────────────┘  │    ┌─────────────────────────┐
└───────────────────────┘    │  Observation Mapper     │
                             │  Tool → Pattern         │
                             └───────────┬─────────────┘
                                         ▼
                             ┌─────────────────────────┐
                             │  Sync Manager           │
                             │  Batch import to        │
                             │  GYWD GlobalMemory      │
                             └─────────────────────────┘
```

### Files Created

**Plugin Core** (`lib/plugins/claude-mem-integration/`):
- `manifest.json` - Plugin configuration
- `index.js` - Main plugin entry, lifecycle management
- `sse-client.js` - SSE streaming with auto-reconnect
- `observation-mapper.js` - Tool-level pattern mapping
- `sync-manager.js` - Batched sync to GlobalMemory

**Plugin Commands** (`lib/plugins/claude-mem-integration/commands/`):
- `mem-search.js` - Search observations
- `mem-sync.js` - Manual sync trigger
- `mem-status.js` - Integration status
- `mem-timeline.js` - Timeline view

**Plugin Bootstrap** (`lib/plugins/`):
- `config.js` - Plugin registry (claude-mem-integration enabled)
- `bootstrap.js` - `initPluginSystem()`, `shutdownPluginSystem()`

**GYWD Skills** (`commands/gywd/`):
- `mem-search.md` - `/gywd:mem-search <query>`
- `mem-sync.md` - `/gywd:mem-sync [--full]`
- `mem-status.md` - `/gywd:mem-status`
- `mem-timeline.md` - `/gywd:mem-timeline`
- `help.md` - Updated with Claude-Mem Integration section

**Tests** (`tests/plugins/claude-mem-integration/`):
- `sse-client.test.js` - 31 tests
- `observation-mapper.test.js` - 45 tests
- `sync-manager.test.js` - 44 tests
- `commands.test.js` - 39 tests
- `bootstrap.test.js` - 16 tests

**Scripts**:
- `scripts/test-claude-mem-integration.js` - E2E test script

### Key Decisions

1. **SSE over WebSockets** - claude-mem uses SSE for streaming, not WebSockets
2. **Tool-level mapping** - Map observations by tool name only, not content extraction
3. **Batch sync** - Queue observations, sync in batches of 100 every 30s
4. **Exponential backoff** - Auto-reconnect with 1s base, max 10 attempts, 60s cap
5. **Queue overflow protection** - Max 10,000 items, drop oldest when full

### Test Results

- **Total tests:** 793 passing
- **Plugin tests:** 175 (159 + 16 bootstrap)
- **All GYWD tests pass**

## How to Resume Work

### Starting the Integration

1. Start claude-mem worker:
   ```bash
   cd ~/claude-mem-study && npx ts-node src/cli/index.ts worker
   # Or if installed globally:
   claude-mem worker
   ```

2. Test the integration:
   ```bash
   cd ~/PMP-GYWD && node scripts/test-claude-mem-integration.js
   ```

3. Use GYWD commands:
   ```
   /gywd:mem-status
   /gywd:mem-search "authentication"
   /gywd:mem-timeline
   ```

### Using the Plugin Programmatically

```javascript
const { initPluginSystem, shutdownPluginSystem } = require('./lib/plugins');

// Initialize all enabled plugins
const { loader, results } = await initPluginSystem();

// Execute plugin commands
await loader.executeCommand('claude-mem-integration:mem-status', {});

// Cleanup
await shutdownPluginSystem();
```

## Next Steps / Future Enhancements

1. **Semantic search** - Use vector similarity for better search results
2. **Auto-context injection** - Automatically inject relevant past context into prompts
3. **Decision linking** - Link observations to GYWD decision graph
4. **Multi-project sync** - Sync patterns across different projects
5. **Dashboard visualization** - Web UI for viewing patterns and observations

## Git History

```
8e83fb7 feat(gywd): add claude-mem GYWD skill commands and test script
466d212 feat(plugin): add plugin configuration and bootstrap system
4aa7a0e feat(plugin): add claude-mem integration plugin
```

## Contact / Repository

- **GitHub:** https://github.com/cyberbloke9/pmp-gywd
- **claude-mem:** https://github.com/thedotmack/claude-mem
