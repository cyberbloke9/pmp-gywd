---
name: GYWD:history
description: Query codebase temporal history - understand evolution, not just state
argument-hint: "<query> [--file <path>] [--since <date>] [--author <name>]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Task
---

<objective>
Enable natural language queries against codebase history.

Current tools show you snapshots. This shows you the **timeline**.

Every version of your code exists simultaneously in understanding. Query the evolution, not just the current state.
</objective>

<philosophy>
Understanding code requires understanding its history:

- Why did this change from X to Y?
- What problems did the old approach have?
- What patterns have emerged over time?
- What refactorings have been attempted and reverted?
- What areas are volatile vs stable?

The temporal dimension is where decisions become visible.
</philosophy>

<query_types>
## Supported Query Patterns

### Evolution Queries
- "When did we start using this pattern?"
- "What did authentication look like before the rewrite?"
- "How has this file evolved over time?"
- "What was removed in the last major refactor?"

### Causation Queries
- "Why did we change the error handling?"
- "What bug led to this fix?"
- "What drove the migration from X to Y?"

### Pattern Queries
- "What files always change together?"
- "Who usually works on this area?"
- "What's the typical commit pattern here?"

### Stability Queries
- "What areas have been most volatile?"
- "What hasn't changed in 6 months?"
- "What gets reverted most often?"

### Prediction Queries
- "Based on evolution, what will need work soon?"
- "What patterns suggest technical debt?"
- "What areas are due for refactoring?"
</query_types>

<process>
## Query Processing

1. **Parse query intent:**
   ```
   Query: "Why did we stop using Redux?"

   Intent: causation
   Subject: "Redux"
   Timeframe: historical (removal)
   Output: decision context
   ```

2. **Gather temporal data:**

   ```bash
   # Find when Redux was removed
   git log -p --all -S "redux" -- "*.ts" "*.tsx"

   # Find related commits
   git log --grep="redux\|state management" --oneline

   # Find PR/issue references
   git log --format="%s %b" | grep -i "redux"
   ```

3. **Build timeline:**
   ```
   Timeline: Redux Usage
   ├── 2023-01-15: Added Redux (commit abc)
   │   └── "Initial state management setup"
   ├── 2023-06-20: Redux Toolkit migration (commit def)
   │   └── "Simplify Redux boilerplate"
   ├── 2024-02-10: Zustand experiment (branch feature/zustand)
   │   └── "Testing lighter alternative"
   ├── 2024-03-01: Redux removed (commit ghi)
   │   └── "Migrated to Zustand - 60% less code"
   └── Current: Zustand in use
   ```

4. **Extract decision context:**
   - Commit messages explaining why
   - PR descriptions with rationale
   - Issue references
   - Code comments during transition

5. **Generate response:**
   ```markdown
   ## Why We Stopped Using Redux

   **Timeline:** Redux was used from Jan 2023 to Mar 2024 (14 months)

   **The Decision:**
   In March 2024, Redux was replaced with Zustand (commit ghi, PR #234).

   **Why:**
   - "60% less boilerplate code" (PR description)
   - "Simpler mental model for new developers" (commit message)
   - "No more action/reducer ceremony" (code comment)

   **The Trigger:**
   Issue #189: "State management complexity slowing onboarding"

   **What Changed:**
   - Removed: redux, react-redux, @reduxjs/toolkit
   - Added: zustand
   - Modified: 34 files
   - Net: -2,400 lines

   **Related Decisions:**
   - DEC-023: "Prefer simplicity over enterprise patterns"
   ```
</process>

<commands>
## Subcommands

### /gywd:history <query>
Natural language query against history.

```
/gywd:history "When did we add TypeScript?"
/gywd:history "What did the API layer look like before microservices?"
/gywd:history "Why was the cache layer removed?"
```

### /gywd:history --file <path>
Show evolution of specific file.

```
/gywd:history --file src/auth/login.ts

Output:
## Evolution: src/auth/login.ts

Created: 2023-02-10 by @alice
Total commits: 47
Major rewrites: 2

Timeline:
├── v1 (Feb-Jun 2023): Basic username/password
├── v2 (Jul 2023): Added OAuth providers
├── v3 (Jan 2024): Complete rewrite for SSO
└── Current: SSO with fallback to OAuth

Stability: Medium (12 changes in last 6 months)
Volatility trend: Decreasing ↓
```

### /gywd:history --author <name>
Show developer's contribution patterns.

```
/gywd:history --author alice

Output:
## Contribution Pattern: @alice

Active: 2023-01 to present
Total commits: 234
Primary areas: auth/, api/, tests/

Expertise signals:
- 80% of auth/ commits
- Original author of OAuth integration
- Primary reviewer for security PRs

Typical patterns:
- Commits in morning (9-11am)
- Large refactors on Fridays
- Always includes tests
```

### /gywd:history --hotspots
Show volatile areas that may need attention.

```
/gywd:history --hotspots

Output:
## Code Hotspots (Last 90 Days)

| File | Changes | Authors | Churn | Risk |
|------|---------|---------|-------|------|
| src/api/orders.ts | 23 | 5 | High | 🔴 |
| src/utils/date.ts | 18 | 3 | High | 🟠 |
| src/auth/session.ts | 15 | 2 | Med | 🟡 |

Patterns detected:
- orders.ts: Possible design instability
- date.ts: Edge case fixes (consider library)
- session.ts: Feature additions (healthy)
```

### /gywd:history --predict
Predict future changes based on patterns.

```
/gywd:history --predict

Output:
## Predicted Changes (Next 30 Days)

Based on evolution patterns:

1. **src/api/payments.ts** (78% confidence)
   - Pattern: Similar evolution to orders.ts
   - Trigger: Usually follows order system changes
   - Prediction: Refactoring needed

2. **src/models/user.ts** (65% confidence)
   - Pattern: Quarterly schema updates
   - Last change: 85 days ago
   - Prediction: Due for update

3. **tests/integration/** (60% confidence)
   - Pattern: Test updates lag feature changes
   - Pending: 12 untested features
   - Prediction: Test sprint coming
```
</commands>

<output_format>
Responses should be:
- **Contextual**: Answer the actual question, not just dump data
- **Temporal**: Show timelines, not just snapshots
- **Causal**: Link changes to reasons when possible
- **Actionable**: Suggest what to do with the information

Use visual timelines for evolution:
```
├── Date: Event
│   └── Context/reason
```

Use tables for comparisons:
```
| Metric | Then | Now | Δ |
```

Use risk indicators:
- 🔴 High risk/volatility
- 🟠 Medium risk
- 🟡 Low risk
- 🟢 Stable
</output_format>

<success_criteria>
- [ ] Parses natural language history queries
- [ ] Builds timelines from git history
- [ ] Extracts decision context from commits/PRs
- [ ] Identifies hotspots and stability patterns
- [ ] Makes predictions based on evolution
- [ ] Links to decision graph when available
- [ ] Provides actionable insights
</success_criteria>
