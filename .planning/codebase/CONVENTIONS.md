# Conventions

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Commands | kebab-case.md | `new-project.md`, `execute-plan.md` |
| Templates | kebab-case.md | `project.md`, `roadmap.md` |
| Core docs | UPPER_CASE.md | `PROJECT.md`, `STATE.md` |
| JavaScript | kebab-case.js | `install.js` |
| Config | lowercase.json | `config.json`, `plugin.json` |

## Code Style (JavaScript)

```javascript
// camelCase for functions and variables
function copyWithPathReplacement(srcDir, destDir, pathPrefix) { }

// ANSI colors as constants
const cyan = '\x1b[36m';
const green = '\x1b[32m';

// 2-space indentation
// No semicolons required (Node.js convention)
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
```

## Document Templates

| Document | Sections |
|----------|----------|
| PROJECT.md | What This Is, Core Value, Requirements, Constraints, Decisions |
| ROADMAP.md | Overview, Phases, Dependencies, Progress |
| STATE.md | Position, Metrics, Context, Continuity |
| PLAN.md | Objective, Context, Tasks, Verification, Success Criteria |
| SUMMARY.md | One-liner, Metrics, Accomplishments, Deviations |
