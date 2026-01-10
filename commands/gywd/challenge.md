---
name: GYWD:challenge
description: Adversarial review - spawn agents that attack your plan/code
argument-hint: "[plan-path|code-path|'current'] [--mode light|standard|aggressive]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Task
  - Write
---

<objective>
Spawn adversarial agents that ATTACK your plan or code.

Current AI cooperates with you. That's the problem.
Cooperation without conflict produces groupthink and blind spots.

This command spawns agents with different adversarial roles:
- **Critic Agent**: Finds flaws in logic and approach
- **Devil's Advocate**: Argues for rejected alternatives
- **Red Team Agent**: Tries to break the implementation
- **Chaos Agent**: Generates edge cases and weird inputs
- **Skeptic Agent**: Questions assumptions and requirements

Solutions that survive this gauntlet are actually robust.
</objective>

<philosophy>
"Strong opinions, weakly held" requires someone to challenge those opinions.

The best human teams have:
- Someone who plays devil's advocate
- Someone who stress-tests ideas
- Someone who asks "what if we're wrong?"

AI teams should too.
</philosophy>

<agents>
## Adversarial Agent Roles

### 1. Critic Agent
**Mission**: Find logical flaws, gaps, and weaknesses.

Looks for:
- Incomplete requirements
- Unstated assumptions
- Missing error handling
- Scalability concerns
- Maintainability issues

Output style:
```markdown
## Critic Report

### Critical Issues
1. **Task 3 has no rollback plan**
   - If database migration fails, system is in inconsistent state
   - Recommendation: Add compensating transaction

### Concerns
1. **Caching strategy assumes low write frequency**
   - Evidence: Cache TTL is 1 hour
   - Risk: Stale data if writes increase
   - Question: What's the expected write pattern?

### Minor Issues
1. **No rate limiting on public endpoint**
```

---

### 2. Devil's Advocate Agent
**Mission**: Argue for the alternatives you rejected.

Takes the opposite position:
- "What if we HAD used microservices?"
- "The simpler approach might actually work"
- "This library has problems you're ignoring"

Output style:
```markdown
## Devil's Advocate Report

### Alternative: Use PostgreSQL Instead of MongoDB

You chose MongoDB for "flexibility." But consider:

**Arguments for PostgreSQL:**
1. Your data IS relational (users → orders → items)
2. ACID transactions would prevent the race condition in Task 4
3. Team has more PostgreSQL experience
4. JSON columns provide flexibility without sacrificing joins

**Counter to your reasoning:**
- "Schema flexibility" → You'll end up with implicit schema anyway
- "Easier scaling" → You're not at scale that requires sharding

**Verdict:** This decision should be revisited.
Confidence: 72%
```

---

### 3. Red Team Agent
**Mission**: Try to break the implementation.

Attack vectors:
- Security vulnerabilities
- Race conditions
- Resource exhaustion
- Invalid input handling
- Dependency failures

Output style:
```markdown
## Red Team Report

### Attack: SQL Injection via Order ID
**Vector:** GET /api/orders/{id}
**Payload:** `1; DROP TABLE orders;--`
**Result:** Query executed without sanitization
**Severity:** CRITICAL

### Attack: Rate Limit Bypass
**Vector:** Rotate IP addresses
**Result:** Rate limiting is per-IP only
**Severity:** HIGH

### Attack: Memory Exhaustion
**Vector:** Upload 10GB file to /api/upload
**Result:** No file size limit, OOM crash
**Severity:** HIGH
```

---

### 4. Chaos Agent
**Mission**: Generate edge cases and weird scenarios.

Generates:
- Boundary conditions
- Null/undefined/empty inputs
- Unicode and encoding issues
- Concurrent access patterns
- Time-related edge cases

Output style:
```markdown
## Chaos Report

### Edge Cases for User Registration

| Input | Expected | Potential Issue |
|-------|----------|-----------------|
| Email: "" | Reject | What error message? |
| Email: "a@b" | ? | Technically valid TLD |
| Name: "​" | ? | Zero-width space only |
| Name: "Robert'); DROP TABLE users;--" | Sanitize | SQL injection |
| Password: 1000 chars | ? | Length limit needed |
| Timezone: "Mars/Olympus" | ? | Invalid timezone handling |
| DOB: "2099-01-01" | ? | Future date validation |
| DOB: "1800-01-01" | ? | Suspiciously old |

### Concurrency Scenarios

| Scenario | Risk |
|----------|------|
| Same user registers twice simultaneously | Duplicate accounts? |
| Email verification during password reset | Token confusion? |
| Session delete during active request | Auth state corruption? |
```

---

### 5. Skeptic Agent
**Mission**: Question the requirements and assumptions.

Challenges:
- "Do we actually need this feature?"
- "Is this the right problem to solve?"
- "What evidence supports this requirement?"
- "Who asked for this and why?"

Output style:
```markdown
## Skeptic Report

### Questioning: Real-time Notifications Feature

**Assumption challenged:** "Users need instant notifications"

**Questions:**
1. What data shows users want real-time vs. batched?
2. What's the cost of WebSocket infrastructure?
3. Would email digest achieve 80% of the value at 20% cost?

**Evidence gap:**
- No user research cited in requirements
- No A/B test proposed
- No success metrics defined

**Recommendation:** Validate assumption before building.
Suggest: User interviews or fake-door test first.
```
</agents>

<modes>
## Challenge Modes

### Light Mode
- 2 agents: Critic + Chaos
- Quick pass, surface-level issues
- ~2 minutes

### Standard Mode (default)
- 4 agents: Critic + Devil's Advocate + Chaos + Red Team
- Comprehensive review
- ~5 minutes

### Aggressive Mode
- 5 agents: All agents
- Deep analysis, no mercy
- Multiple passes until no new issues found
- ~10+ minutes
</modes>

<process>
## Execution Flow

1. **Parse target:**
   - Plan path → Analyze plan tasks and approach
   - Code path → Analyze implementation
   - "current" → Auto-detect current work from STATE.md

2. **Load context:**
   - Read decision graph for existing decisions
   - Load project constraints from PROJECT.md
   - Get codebase patterns from memory

3. **Spawn agents in parallel:**
   ```
   Task: Critic Agent analyzing plan...
   Task: Devil's Advocate Agent analyzing decisions...
   Task: Red Team Agent analyzing security...
   Task: Chaos Agent generating edge cases...
   ```

4. **Collect and synthesize:**
   - Gather all agent reports
   - Deduplicate overlapping issues
   - Rank by severity
   - Identify consensus vs. disagreement

5. **Generate challenge report:**
   ```markdown
   ## Challenge Report: Phase 3 Plan

   **Mode:** Standard
   **Agents:** 4
   **Issues Found:** 12

   ### Consensus Issues (All agents agree)
   - No rollback strategy for migration

   ### Contested Issues (Agents disagree)
   - Database choice (Critic: ok, Devil's Advocate: reconsider)

   ### By Severity
   - 🔴 Critical: 2
   - 🟠 High: 4
   - 🟡 Medium: 4
   - 🟢 Low: 2

   ### Recommended Actions
   1. Add migration rollback plan
   2. Revisit database decision with team
   3. Add rate limiting before deploy
   ```

6. **Offer resolution paths:**
   ```
   What would you like to do?
   1. Address critical issues now
   2. Add issues to plan as tasks
   3. Dismiss with documented reason
   4. Run aggressive mode for deeper analysis
   ```
</process>

<output_files>
Creates `.planning/challenges/` with:

```
.planning/challenges/
├── {date}-{target}-challenge.md  # Full report
├── unresolved.md                  # Tracked issues
└── dismissed.md                   # Dismissed with reasons
```

Unresolved issues integrate with `/gywd:consider-issues`.
</output_files>

<integration>
## Integration Points

### Before Execution
```
/gywd:challenge .planning/phases/03-payment/03-01-PLAN.md
# Review issues
# Decide which to address
/gywd:execute-plan .planning/phases/03-payment/03-01-PLAN.md
```

### During Planning
```
/gywd:plan-phase 3 --with-challenge
# Plan created AND challenged in one step
```

### After Implementation
```
/gywd:challenge src/services/payment/
# Adversarial code review
```

### Continuous Mode
```
/gywd:challenge --watch
# Challenge every commit automatically
```
</integration>

<success_criteria>
- [ ] Spawns multiple adversarial agents in parallel
- [ ] Each agent has distinct perspective and output style
- [ ] Identifies issues across security, logic, edge cases, assumptions
- [ ] Synthesizes findings into actionable report
- [ ] Tracks unresolved issues
- [ ] Integrates with planning workflow
- [ ] Offers resolution paths
</success_criteria>
