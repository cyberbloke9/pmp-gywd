---
name: GYWD:undo
description: Undo recent operations with granular control
argument-hint: "[--last | --commit <sha> | --file <path>] [--preview]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Provide granular undo capability for recent operations. Lighter-weight than full rollback - targets specific actions rather than entire phases.

Use when:
- You made a mistake and want to quickly revert
- A commit introduced a bug
- A file change broke something
- You want to see what would be undone before doing it
</objective>

<context>
**Arguments:**
- `--last` - Undo the last commit (default if no args)
- `--commit <sha>` - Undo a specific commit
- `--file <path>` - Restore a specific file to its last committed state
- `--preview` - Show what would be undone without doing it
- `--hard` - Include working directory changes (destructive)

**Scope:**
- Single commits only (use /gywd:rollback for multi-commit operations)
- Does not modify .planning/ files by default
- Preserves git history (uses revert, not reset --hard)
</context>

<process>

<step name="parse_scope">
Determine what to undo:

```bash
# Check current git status
git status --short
git log --oneline -5
```

**If --last or no args:**
- Target the most recent commit
- Show commit message and changes

**If --commit <sha>:**
- Validate SHA exists
- Show commit details

**If --file <path>:**
- Validate file exists or existed
- Show file history
</step>

<step name="preview_changes">
Always show preview first:

```bash
# For commit undo
git show <sha> --stat

# For file restore
git diff HEAD -- <path>
```

Display:
```
## Undo Preview

**Target:** [commit sha or file path]
**Action:** [what will be undone]

### Changes to Revert
[list of files/changes]

### Impact
- [lines added/removed]
- [files affected]
```
</step>

<step name="confirm_if_needed">
If not --preview and changes are significant:

Ask user:
```
Proceed with undo?
1. Yes, undo now
2. No, cancel
3. Show more details
```
</step>

<step name="execute_undo">
**For commit undo (--last or --commit):**
```bash
# Create revert commit (preserves history)
git revert <sha> --no-edit

# Or for truly last commit, soft reset
git reset --soft HEAD~1
```

**For file restore (--file):**
```bash
git checkout HEAD -- <path>
```

**If --hard specified:**
```bash
git reset --hard HEAD~1
```
</step>

<step name="verify_result">
After undo:

```bash
git status
git log --oneline -3
```

Report:
```
## Undo Complete

**Reverted:** [what was undone]
**Current HEAD:** [new commit sha]

### Verification
- [ ] Working directory clean
- [ ] Tests still pass (run `npm test` to verify)
```
</step>

</process>

<safety>
**Safeguards:**
- Always preview before executing
- Prefer revert over reset (preserves history)
- Never auto-undo .planning/ changes
- Require --hard for destructive operations
- Show clear warnings for uncommitted changes

**Recovery:**
If undo was wrong, use:
```bash
git reflog  # Find the commit
git reset --hard <sha>  # Restore
```
</safety>

<success_criteria>
- [ ] Target operation identified
- [ ] Preview shown to user
- [ ] Undo executed (if confirmed)
- [ ] Result verified
- [ ] No unintended side effects
</success_criteria>
