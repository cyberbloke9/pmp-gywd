# Stack

## Languages

| Language | Usage | Files |
|----------|-------|-------|
| **Markdown** | Primary - Commands, workflows, templates, documentation | 70+ .md files |
| **JavaScript** | Secondary - Installation script | bin/install.js |
| **JSON** | Configuration | package.json, plugin.json, config.json |

## Runtime Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >=16.7.0 | Specified in package.json engines |
| npm | Any | For npx installation |

## Frameworks & Libraries

**None** - Pure Node.js with built-in modules only:
- `fs` - File system operations
- `path` - Cross-platform path handling
- `os` - OS detection, home directory
- `readline` - Interactive CLI prompts

## Package Configuration

```json
{
  "name": "pmp-gywd",
  "version": "1.0.0",
  "bin": { "pmp-gywd": "bin/install.js" },
  "engines": { "node": ">=16.7.0" }
}
```

## Key Design Decision

Zero external dependencies - the entire system runs on Node.js built-ins and markdown files that serve as executable prompts for Claude Code.
