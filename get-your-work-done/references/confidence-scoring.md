# Confidence Scoring Reference

## Overview

Confidence scoring adds transparency to AI decisions by showing certainty levels for plans, tasks, and recommendations. This helps users understand when to trust AI output vs. when to review more carefully.

## Score Scale

| Score | Label | Meaning | User Action |
|-------|-------|---------|-------------|
| 95-100% | **Certain** | Well-established pattern, clear requirements | Trust and proceed |
| 85-94% | **High** | Standard approach, minor ambiguity | Quick review |
| 70-84% | **Moderate** | Multiple valid approaches, some unknowns | Review recommended |
| 50-69% | **Low** | Significant uncertainty, assumptions made | Careful review |
| <50% | **Uncertain** | Guessing, insufficient context | User decision needed |

## When to Apply Scores

### Phase Planning

Each phase should have an overall confidence score:

```markdown
## Phase 3: Payment Integration

**Confidence: 78%** (Moderate)

Factors:
- ✅ Clear requirements for Stripe integration
- ✅ Standard patterns available
- ⚠️ Webhook handling approach uncertain
- ⚠️ Refund flow not fully specified
```

### Task-Level Scoring

Each task in a PLAN.md should include confidence:

```markdown
### Task 1: Create Stripe client wrapper [92% confidence]

- Standard library usage, well-documented API
- Similar patterns exist in codebase

### Task 2: Implement webhook handlers [65% confidence]

- Multiple valid approaches (queue vs direct)
- Error handling strategy unclear
- May need user input on retry policy
```

### Decision Points

When plans include decisions, score each option:

```markdown
## Decision: State Management Approach

| Option | Confidence | Rationale |
|--------|------------|-----------|
| Redux Toolkit | 85% | Team familiarity, existing patterns |
| Zustand | 72% | Simpler, but team hasn't used |
| React Context | 60% | May not scale for this use case |

Recommendation: Redux Toolkit (85%)
```

## Confidence Factors

### Increases Confidence (+)

- Clear, specific requirements
- Existing patterns in codebase
- Well-documented libraries/APIs
- Similar past implementations
- Strong test coverage exists
- Team has relevant experience

### Decreases Confidence (-)

- Vague or missing requirements
- Novel/unusual approach
- Undocumented or experimental tech
- No similar implementations
- External dependencies with unknowns
- Time pressure compromising research

## Integration with Commands

### /gywd:plan-phase

Plans should include:
```markdown
## Plan Confidence Summary

**Overall: 82%** (High)

| Task | Confidence | Flag |
|------|------------|------|
| T1 | 95% | - |
| T2 | 88% | - |
| T3 | 65% | ⚠️ Review |
| T4 | 78% | - |

⚠️ Task 3 has low confidence - consider:
- Breaking into smaller tasks
- Requesting clarification
- Adding research step
```

### /gywd:preview-plan

Show confidence in preview:
```markdown
## Risk Assessment

**Plan Confidence: 76%** (Moderate)

Low-confidence tasks:
- Task 3: Caching strategy (62%) - Multiple valid approaches
- Task 5: Error handling (68%) - Edge cases unclear

Recommendation: Review tasks 3 and 5 before execution
```

### /gywd:execute-plan

During execution, flag low-confidence work:
```
Executing Task 3... [65% confidence]
⚠️ Low confidence task - proceeding with stated approach
   Assumption: Using Redis for caching
   Alternative considered: In-memory with TTL
```

## Calculating Confidence

### Automated Factors

1. **Requirement clarity** (0-25 points)
   - Specific acceptance criteria: +15
   - Clear inputs/outputs: +10

2. **Pattern availability** (0-25 points)
   - Existing pattern in codebase: +15
   - Standard library approach: +10

3. **Complexity assessment** (0-25 points)
   - Single responsibility: +15
   - Limited external deps: +10

4. **Context completeness** (0-25 points)
   - Full codebase context: +15
   - Recent related work: +10

### Human Override

Users can adjust confidence:
```
/gywd:memory add rule "Payment tasks always need review (max 80% confidence)"
```

## Best Practices

1. **Never hide uncertainty** - If unsure, say so
2. **Explain factors** - Show what affects the score
3. **Provide alternatives** - For low-confidence decisions
4. **Flag for review** - Automatically surface <70% items
5. **Learn from outcomes** - Adjust future confidence based on results
