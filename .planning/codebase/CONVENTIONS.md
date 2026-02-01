# Conventions

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Commands | kebab-case.md | `new-project.md`, `execute-plan.md` |
| Templates | kebab-case.md | `project.md`, `roadmap.md` |
| Core docs | UPPER_CASE.md | `PROJECT.md`, `STATE.md` |
| JavaScript | kebab-case.js | `base-agent.js`, `risk-scorer.js` |
| Config | lowercase.json | `config.json`, `plugin.json` |
| Tests | kebab-case.test.js | `base-agent.test.js` |

## Code Style (JavaScript)

```javascript
// camelCase for functions and variables
function copyWithPathReplacement(srcDir, destDir, pathPrefix) { }

// PascalCase for classes
class AgentOrchestrator { }

// UPPER_SNAKE_CASE for constants
const RISK_LEVEL = { SAFE: 'safe', DANGEROUS: 'dangerous' };

// ANSI colors as constants
const cyan = '\x1b[36m';
const green = '\x1b[32m';

// 2-space indentation
// Semicolons optional (Node.js convention)
```

## Module Exports Pattern

```javascript
// Named exports for enums and utilities
const RISK_LEVEL = { ... };
const OPERATION_CATEGORY = { ... };

// Class exports
class OperationClassifier { ... }

// Combined export
module.exports = {
  RISK_LEVEL,
  OPERATION_CATEGORY,
  OperationClassifier
};
```

## Markdown Structure

### YAML Frontmatter (Commands)
```markdown
---
name: GYWD:command-name
description: Brief description
allowed-tools:
  - Read
  - Write
  - Bash
---
```

### XML-Style Tags for Sections
```markdown
<objective>
What this command does and why
</objective>

<context>
@~/.claude/get-your-work-done/workflows/workflow.md
@.planning/PROJECT.md
</context>

<process>
1. Step one
2. Step two
</process>
```

## Progress Tracking

- Checkboxes: `- [ ] Pending` / `- [x] Done`
- Status emoji: ✅ shipped, 🚧 in progress, 📋 planned
- Progress bars: `[████░░░░░░] 40%`

## Phase Numbering

| Type | Format | Example |
|------|--------|---------|
| Regular | Integer | `01-foundation/`, `02-core/` |
| Inserted | Decimal | `02.1-hotfix/`, `02.2-urgent/` |
| Plans | Phase-Sequence | `01-01-PLAN.md`, `02-03-PLAN.md` |

## Cross-File References

```markdown
@~/.claude/get-your-work-done/templates/project.md
@.planning/STATE.md
@.planning/phases/01-foundation/01-01-PLAN.md
```

## Git Commit Format

```
{type}({phase}-{plan}): {description}

Types: feat, fix, test, refactor, perf, chore, docs
Example: feat(01-02): implement user authentication

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Document Templates

| Document | Sections |
|----------|----------|
| PROJECT.md | What This Is, Core Value, Requirements, Constraints, Decisions |
| ROADMAP.md | Overview, Phases, Dependencies, Progress |
| STATE.md | Position, Metrics, Context, Continuity |
| PLAN.md | Objective, Context, Tasks, Verification, Success Criteria |
| SUMMARY.md | One-liner, Metrics, Accomplishments, Deviations |

## Test Naming

```javascript
describe('ModuleName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => { });
    it('should throw on invalid input', () => { });
    it('should return empty array when no matches', () => { });
  });
});
```

## Agent Conventions

### Agent States
```javascript
const AGENT_STATE = {
  IDLE: 'idle',
  SPAWNING: 'spawning',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};
```

### Agent Lifecycle
```javascript
async run() {
  await this.spawn();    // Initialize
  await this.execute();  // Do work
  return this.collect(); // Return results
}
```

## Permission Conventions

### Risk Levels
```javascript
const RISK_LEVEL = {
  SAFE: 'safe',         // Auto-approve
  LOW: 'low',           // Auto-approve with logging
  MEDIUM: 'medium',     // User notification
  HIGH: 'high',         // User approval required
  CRITICAL: 'critical', // Block by default
  UNKNOWN: 'unknown'    // Conservative treatment
};
```

---
*Last updated: 2026-02-01 - v4.0.0*
