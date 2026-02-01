# GYWD MCP Server

Model Context Protocol (MCP) server for GYWD (Get Your Work Done).

## Overview

This MCP server exposes GYWD capabilities to Claude and other MCP-compatible clients, enabling AI assistants to:

- Read project status and roadmap
- Access planning context
- Search project files

## Installation

### NPM (when published)

```bash
npm install -g gywd-mcp-server
```

### From Source

```bash
cd mcp-server
npm install @modelcontextprotocol/sdk
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gywd": {
      "command": "node",
      "args": ["/path/to/pmp-gywd/mcp-server/server.js"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

### Environment Variables

- `GYWD_PLANNING_DIR` - Path to planning directory (default: `.planning`)

## Tools

| Tool | Description |
|------|-------------|
| `get_status` | Get current project status (phase, plan, focus) |
| `get_roadmap` | Get full roadmap content |
| `get_context` | Get STATE.md and PROJECT.md combined |
| `search_files` | Search for files by pattern |

## Resources

The server exposes these planning files as resources:

- `gywd://STATE.md` - Current project state
- `gywd://ROADMAP.md` - Project roadmap
- `gywd://PROJECT.md` - Project specification
- `gywd://ISSUES.md` - Tracked issues

## Usage Example

Once configured, Claude can use the tools:

```
User: What's the current project status?
Claude: [Uses get_status tool]
The project is at Phase 22 of 40, focused on MCP Server implementation.
```

## Development

```bash
# Run server directly
node server.js

# Test with MCP inspector
npx @modelcontextprotocol/inspector node server.js
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK for server implementation

## License

MIT
