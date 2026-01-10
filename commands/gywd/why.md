---
name: GYWD:why
description: Ask why code exists - trace to decisions
argument-hint: "<file|function|pattern> [--deep]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Task
---

<objective>
Answer the question every developer asks: "Why does this code exist?"

Not "what does it do" - that's obvious from reading.
WHY. What decision led to this? What problem was it solving?
What alternatives were considered? What constraints applied?

This is the killer feature of decision-aware development.
</objective>

<philosophy>
"Code is crystallized decisions."

Every function, every pattern, every weird workaround exists because
someone made a decision. Often that decision made sense at the time.
Sometimes it no longer does. But you can't know unless you understand
the original reasoning.
</philosophy>

<process>
## Query Flow

1. **Parse target:**
   - File path → Why does this file exist?
   - Function name → Why is this implemented this way?
   - Pattern → Why do we use this approach?
   - Line range → Why is this specific code here?

2. **Search decision sources:**

   **Explicit sources:**
   - Decision graph (from /gywd:extract-decisions)
   - ADRs and documentation
   - PR descriptions mentioning the target
   - Commit messages for the file/function

   **Implicit sources:**
   - Code comments with "why" language
   - Related issues in issue tracker
   - Temporal context (what changed around it)

3. **Construct narrative:**
   - When was this created/last significantly changed?
   - Who made the decision?
   - What was the context?
   - What alternatives existed?
   - What trade-offs were accepted?

4. **Assess confidence:**
   - Explicit documentation = high confidence
   - Inferred from patterns = low confidence
   - Unknown = flag as gap
</process>

<examples>
## Example Queries

### /gywd:why src/utils/result.ts

```markdown
## Why: src/utils/result.ts

**Answer:** This file implements the Result pattern for type-safe error handling.

### The Decision

**When:** March 2024
**Who:** @alice (PR #47)
**Confidence:** 94% (explicitly documented)

### The Problem Being Solved

> "We kept losing error context in async chains. Try-catch was verbose
> and types weren't helping us catch missing error handling."
> — PR #47 description

### The Choice

Implemented Result<T, E> pattern instead of:
- try-catch blocks (rejected: verbose, no type safety)
- null returns (rejected: ambiguous, TypeScript couldn't help)
- Error subclasses (considered but Result was simpler)

### The Trade-offs Accepted

✅ Type-safe error propagation
✅ Compiler catches missing error handling
⚠️ More verbose call sites (.map, .mapErr, .unwrap)
⚠️ Team needed to learn the pattern

### Current Status

- Used in 47 files
- No attempts to revert or replace
- Decision appears stable

### Related Decisions

- DEC-015: "All service functions return Result"
- DEC-018: "Never throw in business logic layer"
```

---

### /gywd:why "the weird retry logic in payments"

```markdown
## Why: Retry Logic in src/services/payment.ts

**Answer:** This handles a specific Stripe API quirk that caused duplicate charges.

### The Decision

**When:** January 2024
**Who:** @bob (commit def456)
**Confidence:** 87% (commit message + inline comment)

### The Problem Being Solved

> "Stripe can return 500 but still process the charge. Simple retry
> was causing duplicate payments. Lost $4,200 before we caught it."
> — Post-mortem #23

### Why It Looks Weird

The logic:
1. Creates idempotency key before call
2. On 500, waits 2 seconds
3. Queries Stripe for existing charge before retry
4. Only retries if no charge found

This isn't standard retry logic because standard logic was wrong for this case.

### Alternatives Considered

- Don't retry on 500 (rejected: real failures would break checkout)
- Always retry with idempotency key (rejected: Stripe's implementation has edge cases)
- Use webhook confirmation only (rejected: too slow for UX)

### Current Status

- No duplicate charges since implementation
- Decision explicitly marked as "DO NOT SIMPLIFY" in comment
- Related: DEC-031 "Payment operations require explicit acknowledgment"

### Warning

⚠️ If you're thinking about "cleaning up" this code, read post-mortem #23 first.
```

---

### /gywd:why --deep src/api/orders.ts:142-158

```markdown
## Why: Lines 142-158 in src/api/orders.ts

**Answer:** This is an optimistic locking implementation to prevent race conditions.

### Deep Trace

```
Line 142-158: Optimistic lock check
    ↑
Commit abc123 (Feb 2024): "Fix race condition in order updates"
    ↑
Issue #89: "Orders sometimes have wrong totals"
    ↑
Incident #12: P2 outage, concurrent cart modifications
    ↑
Root cause: No locking on order updates
    ↑
Decision: Add optimistic locking with version field
```

### The Full Story

**February 5, 2024:** Customer reports order total was wrong.
**February 6, 2024:** Reproduced - concurrent cart updates overwrote each other.
**February 7, 2024:** Incident declared, quick fix deployed (mutex).
**February 12, 2024:** Proper fix - optimistic locking with version field.

### The Implementation Choice

Why optimistic locking (not pessimistic):
- Cart updates are high-volume (234K/day)
- Conflicts are rare (< 0.1%)
- Pessimistic locks would hurt latency significantly
- Retry on conflict is acceptable UX

### Related Code

- Line 12: Version field in Order type
- Line 89: incrementVersion() helper
- tests/orders.test.ts:234: Concurrency test
```
</examples>

<fallbacks>
## When No Decision Found

```markdown
## Why: src/legacy/oldModule.ts

**Answer:** Unknown. No decision record found.

### What We Know

- Created: 2019-03-12
- Author: @former_employee (no longer with company)
- Last modified: 2021-08-15
- No PR description (direct push to main)
- No comments explaining purpose

### What The Code Does

[Brief description of functionality]

### Recommendation

This code has no documented purpose. Consider:
1. Asking team members who might remember
2. Tracing usage to understand current purpose
3. Documenting discovery if you figure it out
4. Flagging for potential removal if unused

Would you like to add a decision record for this code?
```
</fallbacks>

<success_criteria>
- [ ] Parses natural language queries about code
- [ ] Traces to decision records when available
- [ ] Falls back to git history and inference
- [ ] Shows confidence level in answers
- [ ] Provides full context (problem, alternatives, trade-offs)
- [ ] Identifies gaps in documentation
- [ ] Suggests documentation when gaps found
</success_criteria>
