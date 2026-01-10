---
name: GYWD:anticipate
description: Predictive development - AI that knows what you'll need before you ask
argument-hint: "[--for <context>] [--depth shallow|deep]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Task
  - Write
---

<objective>
Proactively prepare context, patterns, and suggestions BEFORE you need them.

Current AI is reactive: you ask, it responds.
Predictive AI anticipates: it knows what you'll need next.

Based on:
- What you're currently working on
- Patterns from your history
- Common sequences in similar projects
- Your personal development patterns
</objective>

<philosophy>
From cognitive research: "Experts spend more time on 'define problem' phase and more often activate prior knowledge before searching."

Experts anticipate. They gather context before they need it.
AI should do the same.
</philosophy>

<prediction_types>
## What We Anticipate

### 1. Pattern Predictions
**Signal**: You're building X
**Anticipate**: Common patterns that follow X

```
Detected: Implementing user authentication
Anticipated needs:
├── Password hashing patterns
├── JWT token structure
├── Session management approaches
├── Rate limiting for auth endpoints
├── Password reset flow
└── OAuth integration patterns

Pre-loaded: Security best practices for auth
Pre-loaded: Common vulnerabilities (OWASP auth)
```

### 2. File Predictions
**Signal**: You're editing X
**Anticipate**: Files that usually change with X

```
Detected: Editing src/models/user.ts
Co-change patterns from history:
├── src/services/userService.ts (95% co-change)
├── src/api/users.ts (87% co-change)
├── tests/user.test.ts (82% co-change)
└── prisma/schema.prisma (45% co-change)

Pre-loaded: These files are in context
```

### 3. Dependency Predictions
**Signal**: You're adding library X
**Anticipate**: Configuration, patterns, gotchas

```
Detected: Adding 'stripe' package
Anticipated needs:
├── Stripe API patterns for this stack
├── Webhook handling setup
├── Test mode vs live mode config
├── Common Stripe errors and handling
├── PCI compliance considerations
└── Idempotency key patterns

Pre-loaded: Stripe integration checklist
```

### 4. Problem Predictions
**Signal**: Error patterns in current work
**Anticipate**: Similar bugs from history

```
Detected: TypeScript error TS2322 in async function
Similar bugs from your history:
├── 2024-01-15: Same error, solution was Promise<T> return type
├── 2024-02-03: Same error, solution was await missing
└── 2023-11-20: Same error, solution was generic constraint

Pre-loaded: Your past solutions to this error
```

### 5. Flow Predictions
**Signal**: Entering deep work
**Anticipate**: Don't interrupt, batch for later

```
Detected: Flow state (15+ min focused editing)
Actions:
├── Batching non-critical suggestions
├── Suppressing optional notifications
├── Preparing summary for when you pause
└── Tracking questions you might have after

On pause: Here's what accumulated while you were focused
```
</prediction_types>

<process>
## Anticipation Engine

### 1. Context Detection

Monitor for signals:
```python
signals = {
    "file_edit": detect_file_edit_patterns(),
    "search_query": detect_search_patterns(),
    "error_occurrence": detect_error_patterns(),
    "package_add": detect_dependency_changes(),
    "time_of_day": get_time_patterns(),
    "session_duration": get_focus_duration(),
    "commit_patterns": get_recent_commit_context()
}
```

### 2. Pattern Matching

Match signals to predictions:
```
IF editing auth-related file AND morning session:
    PREDICT: Security-focused work
    ANTICIPATE: Auth patterns, security checklist

IF TypeScript error AND similar to past error:
    PREDICT: Known issue
    ANTICIPATE: Past solutions

IF new feature file AND tests don't exist:
    PREDICT: Will need tests soon
    ANTICIPATE: Test patterns for this file type
```

### 3. Pre-loading

Based on predictions, pre-load:
```
context.preload({
    patterns: relevant_code_patterns(),
    decisions: related_decisions(),
    history: similar_past_work(),
    warnings: potential_pitfalls(),
    suggestions: likely_next_steps()
})
```

### 4. Delivery

Deliver anticipations appropriately:
- **Immediate**: Critical warnings (security issues)
- **Available**: Ready when you ask (patterns in context)
- **Batched**: Non-urgent (suggestions for later)
- **Hidden**: Background prep (pre-indexed context)
</process>

<output_format>
## When Running Manually

```markdown
## Anticipation Report

**Context**: Working on payment integration
**Confidence**: 85%

### Ready for You

**Patterns pre-loaded:**
- Stripe payment intent flow
- Webhook signature verification
- Idempotency handling

**Relevant decisions:**
- DEC-015: "All payments use Result pattern"
- DEC-023: "Log all payment state changes"

**Similar past work:**
- 2024-01: Subscription billing (same patterns)
- Your solution: src/services/subscriptionPayment.ts

### Potential Issues Ahead

⚠️ **Webhook timing**: You'll likely hit race condition between
   payment confirmation and order creation. See how you solved
   this in orders.ts:142

⚠️ **Test mode gotcha**: Stripe test webhooks have different
   signatures. Past you spent 2 hours on this.

### Suggested Next Steps

Based on your typical flow:
1. Create payment intent endpoint (you usually start here)
2. Add webhook handler (you always forget this initially)
3. Write integration tests (you defer but always need)
```
</output_format>

<learning>
## How Anticipate Learns

### From Your Behavior
- Which anticipations you used vs ignored
- What you searched for after anticipations
- What was missing from predictions

### From Outcomes
- Did anticipated patterns help?
- Did warnings prevent issues?
- Were suggestions relevant?

### Feedback Loop
```
anticipation.record({
    prediction: "Will need webhook handler",
    actual: "Created webhook handler 10 min later",
    useful: true
})

# Next time: Higher confidence for this prediction
```
</learning>

<integration>
## Auto-Anticipate Mode

Enable in config.json:
```json
{
  "anticipate": {
    "enabled": true,
    "auto_preload": true,
    "flow_protection": true,
    "learning": true
  }
}
```

When enabled:
- Background anticipation runs continuously
- Context is pre-loaded without explicit command
- Flow state is protected automatically
- System learns from your patterns
</integration>

<success_criteria>
- [ ] Detects current work context accurately
- [ ] Predicts likely next needs
- [ ] Pre-loads relevant patterns and decisions
- [ ] Respects flow state (doesn't interrupt)
- [ ] Learns from behavior over time
- [ ] Surfaces warnings proactively
- [ ] Batches non-urgent suggestions
</success_criteria>
