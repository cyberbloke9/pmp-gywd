---
name: GYWD:sync-github
description: Sync GYWD project state with GitHub issues, PRs, and milestones
argument-hint: "[issues|prs|milestones|all]"
---

<objective>
Bidirectional sync between GYWD planning files and GitHub:

**From GYWD → GitHub:**
- Create GitHub issues from ISSUES.md
- Create GitHub milestones from ROADMAP.md
- Create PRs for completed phases

**From GitHub → GYWD:**
- Import GitHub issues to ISSUES.md
- Sync issue status changes
- Link PR merges to phase completion
</objective>

<context>
Sync type: $ARGUMENTS

Options:
- `issues` - Sync issues bidirectionally
- `prs` - Create PRs for completed work
- `milestones` - Sync milestones with GitHub
- `all` - Full sync (default)
- `status` - Show sync status without changes
</context>

<prerequisites>
Requires:
- `gh` CLI installed and authenticated
- Git remote configured to GitHub
- Repository write access
</prerequisites>

<process>
## status (check sync state)

```markdown
## GitHub Sync Status

**Repository:** cyberbloke9/my-project
**Last sync:** 2024-01-15 14:30

### Issues

| GYWD | GitHub | Status |
|------|--------|--------|
| #1 Auth bug | #12 | ✅ Synced |
| #2 Performance | #15 | ✅ Synced |
| #3 New feature | - | ⬆️ Needs push |
| - | #18 (bug) | ⬇️ Needs import |

### Milestones

| GYWD | GitHub | Status |
|------|--------|--------|
| v1.0 MVP | v1.0 | ✅ Synced |
| v1.1 Features | - | ⬆️ Needs push |

### PRs

| Phase | PR | Status |
|-------|-----|--------|
| Phase 1 | #5 | ✅ Merged |
| Phase 2 | #8 | 🔄 Open |
| Phase 3 | - | 📋 Ready to create |
```

## issues

### Push to GitHub

For each issue in ISSUES.md without GitHub link:
```bash
gh issue create \
  --title "Issue title" \
  --body "Description from ISSUES.md" \
  --label "from-gywd"
```

Update ISSUES.md with GitHub issue number:
```markdown
## #3 Add dark mode [GitHub: #19]

Status: Open
Created: 2024-01-15
...
```

### Import from GitHub

```bash
# Get issues labeled for import
gh issue list --label "needs-planning" --json number,title,body
```

Add to ISSUES.md:
```markdown
## #4 Mobile responsive [GitHub: #20]

Status: Open
Source: GitHub import
Priority: Medium
...
```

## milestones

### Push to GitHub

```bash
gh api repos/{owner}/{repo}/milestones \
  --method POST \
  -f title="v1.1 Features" \
  -f description="Phase 4-7 features" \
  -f due_on="2024-02-01"
```

### Sync Progress

Update milestone progress based on closed issues:
```markdown
## Milestone Sync

v1.0 MVP: 80% complete (8/10 issues closed)
v1.1 Features: 20% complete (2/10 issues closed)
```

## prs

### Create PR for Phase

When phase completes, offer to create PR:

```markdown
## Create PR for Phase 3?

**Branch:** feature/phase-3-payment
**Target:** main
**Changes:** 12 files, +450/-20 lines

### Suggested PR Description

## Summary
- Implemented Stripe payment integration
- Added webhook handling
- Created payment history API

## Test Plan
- [x] Unit tests pass
- [x] Integration tests pass
- [ ] Manual checkout flow test

## Related Issues
Closes #12, #15

---

Create PR? [Y/n]: _
```

```bash
gh pr create \
  --title "feat: Phase 3 - Payment Integration" \
  --body "..." \
  --base main \
  --head feature/phase-3-payment
```

### Link Merged PRs

When PR merges, update STATE.md:
```markdown
## Completed Phases

| Phase | PR | Merged |
|-------|-----|--------|
| Phase 1 | #5 | 2024-01-10 |
| Phase 2 | #8 | 2024-01-12 |
| Phase 3 | #11 | 2024-01-15 |
```

## all (full sync)

1. Check status
2. Push new issues to GitHub
3. Import new GitHub issues
4. Sync milestones
5. Offer to create PRs for completed work
6. Update sync timestamp

Output:
```markdown
## Sync Complete

| Action | Count |
|--------|-------|
| Issues pushed | 2 |
| Issues imported | 1 |
| Milestones synced | 1 |
| PRs created | 1 |

Next sync: Run `/gywd:sync-github` anytime
```
</process>

<configuration>
Settings in config.json:
```json
{
  "github": {
    "auto_sync": false,
    "import_labels": ["needs-planning", "enhancement"],
    "export_label": "from-gywd",
    "create_prs": "prompt",
    "milestone_sync": true
  }
}
```
</configuration>

<success_criteria>
- [ ] Shows current sync status
- [ ] Pushes local issues to GitHub
- [ ] Imports GitHub issues locally
- [ ] Syncs milestones bidirectionally
- [ ] Creates PRs for completed phases
- [ ] Updates planning files with GitHub links
- [ ] Handles auth/permission errors gracefully
</success_criteria>
