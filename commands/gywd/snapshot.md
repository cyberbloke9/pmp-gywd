---
name: GYWD:snapshot
description: Create and manage named checkpoints for recovery
argument-hint: "[create <name> | list | restore <name> | delete <name>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
---

<objective>
Create immutable, named checkpoints of project state for easy recovery. More discoverable than raw git tags, with rich metadata.

Use when:
- Before starting experimental work
- At significant milestones
- Before risky operations
- To create recovery points
</objective>

<context>
**Subcommands:**
- `create <name>` - Create new snapshot with description
- `list` - List all snapshots with metadata
- `restore <name>` - Restore to a snapshot
- `delete <name>` - Remove a snapshot
- `describe <name>` - Show detailed snapshot info

**Snapshot Storage:**
- Git tag: `gywd-snapshot/<name>`
- Metadata: `.planning/snapshots/<name>.json`

**Auto-snapshot:**
When risky operations are detected (rollback, major refactor), system may auto-create snapshots.
</context>

<process>

<step name="parse_command">
Determine operation:

```bash
case "$1" in
  create) action="create"; name="$2" ;;
  list)   action="list" ;;
  restore) action="restore"; name="$2" ;;
  delete) action="delete"; name="$2" ;;
  describe) action="describe"; name="$2" ;;
  *) action="create"; name="$1" ;;  # Default to create
esac
```
</step>

<step name="create_snapshot">
**For create:**

1. Validate name (alphanumeric, hyphens, underscores)
2. Check for uncommitted changes
3. Create git tag
4. Save metadata

```bash
# Validate clean state or warn
git status --porcelain

# Create annotated tag
git tag -a "gywd-snapshot/$name" -m "GYWD snapshot: $name"
```

Create metadata file `.planning/snapshots/<name>.json`:
```json
{
  "name": "<name>",
  "created": "<ISO timestamp>",
  "commit": "<full SHA>",
  "branch": "<current branch>",
  "description": "<user provided>",
  "phase": "<current phase number>",
  "plan": "<current plan number>",
  "context": {
    "uncommittedFiles": [],
    "testStatus": "passing|failing|unknown",
    "filesChanged": <count since last snapshot>
  }
}
```

Prompt for description:
```
Snapshot name: $name
Commit: $sha

Describe this snapshot (optional):
> [user input]
```

Output:
```
## Snapshot Created

**Name:** $name
**Commit:** $sha
**Branch:** $branch
**Time:** $timestamp

To restore: `/gywd:snapshot restore $name`
```
</step>

<step name="list_snapshots">
**For list:**

```bash
# Get all snapshot tags
git tag -l "gywd-snapshot/*"
```

Read metadata files and display:
```
## Snapshots

| Name | Created | Phase | Commit | Description |
|------|---------|-------|--------|-------------|
| pre-refactor | 2026-02-01 | 19 | abc123 | Before big cleanup |
| v3.3-release | 2026-01-24 | 18 | def456 | Release candidate |

Total: N snapshots
```
</step>

<step name="restore_snapshot">
**For restore:**

1. Verify snapshot exists
2. Show what will change
3. Confirm with user
4. Create auto-snapshot of current state
5. Restore

```bash
# Get snapshot commit
commit=$(git rev-parse "gywd-snapshot/$name")

# Show diff
git diff HEAD..$commit --stat
```

Confirm:
```
## Restore Snapshot: $name

**Current HEAD:** $current_sha
**Restoring to:** $snapshot_sha

### Changes
[files that will change]

⚠️ This will create an auto-snapshot of current state first.

Proceed?
1. Yes, restore
2. No, cancel
3. Show detailed diff
```

Execute:
```bash
# Auto-snapshot current state
git tag -a "gywd-snapshot/auto-before-restore-$(date +%Y%m%d-%H%M%S)" -m "Auto-snapshot before restoring to $name"

# Restore
git checkout $commit
# Or create a branch from snapshot
git checkout -b "restore-$name" $commit
```
</step>

<step name="delete_snapshot">
**For delete:**

```bash
# Confirm
echo "Delete snapshot '$name'?"

# Remove tag
git tag -d "gywd-snapshot/$name"

# Remove metadata
rm .planning/snapshots/$name.json
```
</step>

<step name="describe_snapshot">
**For describe:**

Read and display full metadata:
```
## Snapshot: $name

**Created:** $timestamp
**Commit:** $sha
**Branch:** $branch
**Phase:** $phase (Plan $plan)

### Description
$description

### Context at Creation
- Test status: $testStatus
- Files changed since previous snapshot: $count

### Files in Commit
[list key files from that commit]

### Commands
- Restore: `/gywd:snapshot restore $name`
- Compare to now: `/gywd:compare $sha HEAD`
- Delete: `/gywd:snapshot delete $name`
```
</step>

</process>

<auto_snapshot>
The system may auto-create snapshots:

1. **Before rollback** - `auto-pre-rollback-<timestamp>`
2. **Before restore** - `auto-pre-restore-<timestamp>`
3. **At phase completion** - `auto-phase-<N>-complete`
4. **Before destructive operations** - `auto-safety-<timestamp>`

Auto-snapshots older than 30 days may be pruned.
</auto_snapshot>

<examples>
```bash
# Create a snapshot before experimental work
/gywd:snapshot create pre-experiment
> Describe: Before trying new caching approach

# List all snapshots
/gywd:snapshot list

# Restore to a previous state
/gywd:snapshot restore pre-experiment

# See snapshot details
/gywd:snapshot describe v3.3-release

# Clean up old snapshot
/gywd:snapshot delete old-test
```
</examples>

<success_criteria>
- [ ] Operation completed successfully
- [ ] Git tag created/removed as needed
- [ ] Metadata file managed correctly
- [ ] User informed of result
- [ ] Recovery path clear
</success_criteria>
