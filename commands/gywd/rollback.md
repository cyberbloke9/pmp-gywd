---
name: GYWD:rollback
description: Rollback to a previous checkpoint or phase
argument-hint: "[phase-number|plan-id|'last']"
---

<objective>
Safely rollback work to a previous checkpoint when something goes wrong.

Rollback types:
- **Phase rollback**: Undo entire phase
- **Plan rollback**: Undo specific plan
- **Last rollback**: Undo most recent plan

Uses git history to restore code state while preserving planning artifacts for learning.
</objective>

<context>
Target: $ARGUMENTS

Options:
- Phase number: `3` - Rollback to before phase 3
- Plan ID: `03-02` - Rollback to before plan 03-02
- `last` - Rollback the most recent plan
- No args - Interactive selection
</context>

<process>
## 1. Parse Target

If no arguments:
```
## Rollback Options

Recent checkpoints:

1. [last] Plan 03-02: Payment webhooks (2 hours ago)
2. [03-01] Plan 03-01: Stripe integration (yesterday)
3. [phase-2] Phase 2 complete (3 days ago)
4. [phase-1] Phase 1 complete (1 week ago)

Select: _
```

## 2. Identify Rollback Point

Find the git commit/tag for the checkpoint:
- Phases have tags: `gywd-phase-{n}-complete`
- Plans have commits: Search for `docs({phase}-{plan}): complete`

## 3. Show Impact Analysis

```markdown
## Rollback Impact: Plan 03-02

**Target:** Before "Payment webhooks" implementation
**Commit:** abc1234
**Files affected:** 5

### Changes to Revert

| File | Action | Lines |
|------|--------|-------|
| src/webhooks/stripe.ts | DELETE | -120 |
| src/routes/webhooks.ts | DELETE | -45 |
| src/services/payment.ts | MODIFY | -30 |
| tests/webhooks.test.ts | DELETE | -80 |
| package.json | MODIFY | -2 deps |

### Planning Files

These will be PRESERVED (not rolled back):
- .planning/phases/03-payment/03-02-PLAN.md
- .planning/phases/03-payment/03-02-SUMMARY.md (will be updated)
- .planning/STATE.md (will be updated)

### Confirm Rollback?

This will:
1. Revert code to commit abc1234
2. Mark plan 03-02 as "rolled back" in STATE.md
3. Add rollback note to SUMMARY.md
4. Create new commit documenting rollback

[Y/n]: _
```

## 4. Execute Rollback

```bash
# Create rollback branch for safety
git checkout -b rollback-03-02-{timestamp}

# Revert changes (keeping history)
git revert --no-commit abc1234..HEAD

# Commit rollback
git commit -m "rollback(03-02): revert payment webhooks

Reason: {user-provided or 'Manual rollback requested'}

Rolled back commits:
- abc1234: feat(03-02): implement webhook handlers
- def5678: feat(03-02): add webhook tests

Planning artifacts preserved for reference."
```

## 5. Update Planning State

Update STATE.md:
```markdown
## Rollbacks

| Plan | Date | Reason | Branch |
|------|------|--------|--------|
| 03-02 | 2024-01-15 | Webhook approach didn't work | rollback-03-02-1705312345 |
```

Update SUMMARY.md (add note):
```markdown
## Rollback Note

**Status:** ROLLED BACK
**Date:** 2024-01-15
**Reason:** {reason}
**Recovery branch:** rollback-03-02-1705312345

The approach in this plan was reverted. See alternative approach in plan 03-03.
```

## 6. Provide Recovery Options

```markdown
## Rollback Complete

Code reverted to before plan 03-02.

### Recovery Options

If you need the rolled-back code:
```
git checkout rollback-03-02-1705312345
```

### Next Steps

1. `/gywd:plan-phase 3` - Re-plan this phase
2. `/gywd:memory add pattern "Webhooks: avoid approach X"` - Remember lesson
3. Continue with alternative approach
```
</process>

<safety_features>
**Before rollback:**
- Creates safety branch
- Shows full impact analysis
- Requires confirmation

**During rollback:**
- Uses git revert (preserves history)
- Never uses --hard reset
- Keeps planning files

**After rollback:**
- Documents reason
- Creates recovery path
- Updates project state
</safety_features>

<success_criteria>
- [ ] Shows clear impact analysis
- [ ] Creates safety branch before changes
- [ ] Uses git revert (not reset)
- [ ] Preserves planning files
- [ ] Documents rollback reason
- [ ] Updates STATE.md with rollback record
- [ ] Provides recovery options
</success_criteria>
