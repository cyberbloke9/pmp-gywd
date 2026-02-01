---
name: GYWD:compare
description: Compare versions, branches, phases, or specifications
argument-hint: "<source> <target> [--mode summary|detailed|diff]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

<objective>
Compare two versions of code, branches, phases, or specifications to understand what changed and why.

Use when:
- Reviewing changes between releases
- Understanding what a phase accomplished
- Comparing implementation against specification
- Debugging regressions by finding what changed
</objective>

<context>
**Arguments:**
- `<source>` - First version (commit, branch, tag, phase number)
- `<target>` - Second version (defaults to HEAD/current)
- `--mode summary` - High-level overview (default)
- `--mode detailed` - Full change breakdown
- `--mode diff` - Raw git diff output
- `--files` - Filter to specific files/patterns

**Comparison Types:**
1. **Commit comparison** - Two commit SHAs
2. **Branch comparison** - Branch names
3. **Phase comparison** - Phase numbers (e.g., "18" vs "19")
4. **Spec comparison** - PROJECT.md vs implementation
</context>

<process>

<step name="parse_arguments">
Determine comparison type:

```bash
# Check if source is a phase number
if [[ "$source" =~ ^[0-9]+$ ]]; then
  # Phase comparison
  type="phase"
else
  # Git reference comparison
  git rev-parse --verify "$source" 2>/dev/null && type="git"
fi
```

Resolve references:
- Phase X → Find commits tagged with phase X
- Branch → Resolve to commit SHA
- Tag → Resolve to commit SHA
</step>

<step name="gather_comparison_data">
**For git comparisons:**
```bash
# Get diff stats
git diff --stat $source..$target

# Get file changes
git diff --name-status $source..$target

# Get commit log between
git log --oneline $source..$target
```

**For phase comparisons:**
```bash
# Read phase summaries
cat .planning/phases/${source}-*/SUMMARY.md
cat .planning/phases/${target}-*/SUMMARY.md
```

**For spec comparisons:**
```bash
# Compare PROJECT.md requirements vs actual code
cat .planning/PROJECT.md
```
</step>

<step name="render_summary">
**Summary Mode (default):**
```
## Comparison: $source → $target

### Overview
- **Commits:** [N] commits between versions
- **Files changed:** [N] files
- **Lines:** +[added] / -[removed]

### Key Changes
1. [Major change 1]
2. [Major change 2]
3. [Major change 3]

### Categories
| Category | Files | Changes |
|----------|-------|---------|
| lib/     | X     | +Y/-Z   |
| tests/   | X     | +Y/-Z   |
| docs/    | X     | +Y/-Z   |
```
</step>

<step name="render_detailed">
**Detailed Mode:**
```
## Detailed Comparison: $source → $target

### Commits
| SHA | Author | Message |
|-----|--------|---------|
| abc123 | User | feat: ... |
| def456 | User | fix: ... |

### Files Changed

#### Added
- path/to/new/file.js

#### Modified
- path/to/changed/file.js (+10/-5)

#### Deleted
- path/to/removed/file.js

### Code Changes by Module
[For each major module, show specific changes]
```
</step>

<step name="render_diff">
**Diff Mode:**
```bash
git diff $source..$target
```

With syntax highlighting if available.
</step>

<step name="phase_comparison">
**For phase comparisons:**
```
## Phase Comparison: Phase $source → Phase $target

### Phase $source: [name]
**Goal:** [from ROADMAP.md]
**Completed:** [date]
**Key deliverables:**
- [item 1]
- [item 2]

### Phase $target: [name]
**Goal:** [from ROADMAP.md]
**Completed:** [date or "in progress"]
**Key deliverables:**
- [item 1]
- [item 2]

### Evolution
- [What capabilities were added]
- [What was improved]
- [Architecture changes]
```
</step>

</process>

<examples>
```bash
# Compare last two commits
/gywd:compare HEAD~1 HEAD

# Compare branches
/gywd:compare main feature-branch

# Compare phases
/gywd:compare 18 19

# Detailed file comparison
/gywd:compare v1.0 v2.0 --mode detailed --files "lib/**"

# Show raw diff
/gywd:compare abc123 def456 --mode diff
```
</examples>

<success_criteria>
- [ ] Source and target resolved correctly
- [ ] Appropriate comparison mode selected
- [ ] Clear, readable output generated
- [ ] Key changes highlighted
- [ ] No errors in git commands
</success_criteria>
