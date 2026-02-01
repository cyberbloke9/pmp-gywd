# PMP-GYWD VS Code Extension

VS Code integration for GYWD (Get Your Work Done) - Decision-aware development for Claude Code.

## Features

- **Status Bar**: Shows current phase/plan in the VS Code status bar
- **Command Palette**: Quick access to GYWD commands
- **File Watcher**: Auto-updates when STATE.md changes

## Commands

Access via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| GYWD: Show Status | Display current project status |
| GYWD: Show Progress | Open ROADMAP.md |
| GYWD: Execute Current Plan | Guidance for plan execution |
| GYWD: Help | Show available commands |
| GYWD: Open Roadmap | Open ROADMAP.md in editor |
| GYWD: Open State | Open STATE.md in editor |

## Installation

### From Source

1. Clone the repository
2. Open `vscode-extension/` in VS Code
3. Press F5 to run in Extension Development Host

### Manual Installation

1. Copy `vscode-extension/` to your VS Code extensions folder:
   - Windows: `%USERPROFILE%\.vscode\extensions\pmp-gywd`
   - macOS: `~/.vscode/extensions/pmp-gywd`
   - Linux: `~/.vscode/extensions/pmp-gywd`
2. Restart VS Code

## Requirements

- VS Code 1.74.0 or higher
- A GYWD project (directory with `.planning/` folder)

## Status Bar

When a GYWD project is detected (contains `.planning/` directory):

```
$(rocket) GYWD: Phase 20/40
```

Click the status bar item to show full status.

## Development

```bash
# Install dependencies (none required for basic extension)
cd vscode-extension

# Test in VS Code
# 1. Open vscode-extension/ folder in VS Code
# 2. Press F5 to launch Extension Development Host
# 3. Open a folder containing .planning/
```

## License

MIT
