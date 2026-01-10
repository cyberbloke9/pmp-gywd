# Adaptive Task Decomposition Reference

## Overview

Adaptive task decomposition automatically adjusts task granularity based on detected complexity. Simple tasks stay simple; complex tasks get broken down further.

## Complexity Detection

### Complexity Indicators

| Indicator | Weight | Description |
|-----------|--------|-------------|
| External dependencies | +3 | APIs, databases, third-party services |
| State management | +2 | Complex state flows, side effects |
| Async operations | +2 | Promises, callbacks, event handling |
| Multiple files | +1/file | Cross-file changes beyond 3 |
| Novel patterns | +2 | No existing pattern in codebase |
| Security-sensitive | +3 | Auth, encryption, permissions |
| Performance-critical | +2 | Must meet specific benchmarks |
| Data migrations | +4 | Schema changes, data transforms |

### Complexity Scoring

| Score | Level | Task Size | Decomposition |
|-------|-------|-----------|---------------|
| 0-3 | Low | Small | Keep as single task |
| 4-6 | Medium | Standard | 2-3 subtasks |
| 7-10 | High | Large | 4-6 subtasks |
| 11+ | Very High | Epic | Split into separate plan |

## Decomposition Rules

### When to Decompose

1. **Task exceeds complexity threshold (7+)**
   ```
   Original: "Implement user authentication"
   Complexity: 12 (High)

   Decomposed:
   - T1.1: Create user model and schema
   - T1.2: Implement password hashing
   - T1.3: Create JWT token service
   - T1.4: Build login endpoint
   - T1.5: Build registration endpoint
   - T1.6: Add authentication middleware
   ```

2. **Task has unclear verification**
   ```
   Original: "Make the app faster"
   Issue: No clear done state

   Decomposed:
   - T1.1: Profile current performance (baseline)
   - T1.2: Identify top 3 bottlenecks
   - T1.3: Optimize bottleneck #1
   - T1.4: Optimize bottleneck #2
   - T1.5: Optimize bottleneck #3
   - T1.6: Verify improvement vs baseline
   ```

3. **Task spans multiple domains**
   ```
   Original: "Add payment processing"
   Domains: API, Database, UI, External Service

   Decomposed:
   - T1.1: Database schema for transactions
   - T1.2: Stripe API integration
   - T1.3: Payment endpoint
   - T1.4: Transaction history UI
   - T1.5: Webhook handling
   ```

### When NOT to Decompose

1. **Simple CRUD operations** (complexity < 4)
2. **Configuration changes**
3. **Documentation updates**
4. **Style/formatting fixes**
5. **Single-file changes with clear scope**

## Integration with plan-phase

### Automatic Detection

During `/gywd:plan-phase`, each task is scored:

```markdown
## Phase 3: Payment Integration

### Initial Tasks (Before Decomposition)

1. Add payment processing (complexity: 14) → DECOMPOSE
2. Update user model for billing (complexity: 4) → KEEP
3. Add Stripe webhook handling (complexity: 8) → DECOMPOSE
4. Update tests (complexity: 3) → KEEP

### After Adaptive Decomposition

1.1 Create transaction database schema [3]
1.2 Implement Stripe client wrapper [4]
1.3 Create payment intent endpoint [5]
1.4 Handle successful payment [4]
1.5 Handle failed payment [4]
1.6 Create payment history endpoint [3]

2. Update user model for billing [4]

3.1 Create webhook endpoint [4]
3.2 Verify webhook signatures [3]
3.3 Handle payment_intent.succeeded [3]
3.4 Handle payment_intent.failed [3]

4. Update tests [3]
```

### User Override

Users can control decomposition:

```bash
# Force decomposition
/gywd:plan-phase 3 --decompose-all

# Prevent decomposition
/gywd:plan-phase 3 --no-decompose

# Set custom threshold
/gywd:plan-phase 3 --complexity-threshold 10
```

### Memory Integration

Decomposition patterns are learned:

```markdown
## MEMORY.md

### Patterns

- Payment tasks always decompose into: schema → client → endpoints → webhooks
- Auth tasks split by: model → crypto → endpoints → middleware
- API tasks split by: endpoint type (GET/POST/PUT/DELETE)
```

## Output Format

When a plan uses adaptive decomposition:

```markdown
## Decomposition Summary

This plan used adaptive task decomposition.

| Original Task | Complexity | Result |
|--------------|------------|--------|
| Payment processing | 14 | Split into 6 subtasks |
| Update user model | 4 | Kept as-is |
| Webhook handling | 8 | Split into 4 subtasks |
| Update tests | 3 | Kept as-is |

**Original tasks:** 4
**After decomposition:** 12
**Average complexity:** 3.5 (down from 7.2)
```

## Benefits

1. **Predictable execution** - Each task is right-sized
2. **Better commits** - One feature per commit
3. **Easier review** - Smaller, focused changes
4. **Progress visibility** - More granular tracking
5. **Reduced risk** - Problems caught earlier
