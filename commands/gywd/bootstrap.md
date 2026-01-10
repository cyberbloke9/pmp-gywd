---
name: GYWD:bootstrap
description: Initialize GYWD v2.0 core on any codebase - full decision intelligence
argument-hint: "[--deep] [--quick]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
---

<objective>
Bootstrap the complete GYWD v2.0 intelligence system on any codebase.

This is the "one command to rule them all" - it:
1. Maps the codebase structure
2. Extracts the decision graph from history
3. Builds the context intelligence model
4. Creates the developer profile
5. Initializes the learning system

After bootstrap, GYWD understands your codebase at a decision level,
not just a file level.
</objective>

<philosophy>
v1.x required running multiple commands:
- /gywd:map-codebase
- /gywd:new-project
- /gywd:create-roadmap
- /gywd:extract-decisions

v2.0 does it all intelligently with one command.
</philosophy>

<modes>
## Bootstrap Modes

### Quick Mode (--quick)
- Shallow git history (last 100 commits)
- Essential codebase mapping only
- Skip detailed decision extraction
- ~2 minutes

### Standard Mode (default)
- Full git history analysis
- Complete codebase mapping
- Full decision extraction
- Developer profile initialization
- ~5-10 minutes

### Deep Mode (--deep)
- Exhaustive history analysis
- Cross-reference with issues/PRs if available
- Multiple pass decision extraction
- Adversarial validation of decisions
- ~15-30 minutes
</modes>

<process>
## Phase 1: Codebase Analysis

Spawn parallel agents:

```
Agent 1: Structure Analysis
├── Directory layout
├── Entry points
├── Module organization
└── Key files identification

Agent 2: Stack Detection
├── Languages and frameworks
├── Dependencies
├── Build system
└── Test setup

Agent 3: Pattern Recognition
├── Coding conventions
├── Architectural patterns
├── Common idioms
└── Anti-patterns present
```

Output: `.planning/codebase/` populated

## Phase 2: Decision Extraction

```
1. Parse git history
   ├── Commit messages
   ├── Merge commits (PRs)
   └── Refactoring patterns

2. Analyze documentation
   ├── README files
   ├── Architecture docs
   ├── ADRs if present
   └── Code comments

3. Infer from code
   ├── Consistent patterns → implicit decisions
   ├── Unusual choices → explicit decisions likely
   └── Tech stack choices → architectural decisions

4. Build graph
   ├── Link related decisions
   ├── Identify decision chains
   └── Detect conflicts
```

Output: `.planning/core/decisions.json` + `.planning/codebase/DECISIONS.md`

## Phase 3: Context Model

```
1. Analyze file relationships
   ├── Import/dependency graph
   ├── Co-change patterns (files that change together)
   └── Ownership patterns (who works on what)

2. Build context predictions
   ├── If working on X, likely need Y
   ├── If error in A, check B
   └── If adding feature like C, pattern is D

3. Initialize context budget
   ├── Estimate token usage per area
   ├── Identify high-value context
   └── Set compression strategies
```

Output: `.planning/core/context-model.json`

## Phase 4: Developer Profile

```
1. Analyze git contributions
   ├── Areas of focus
   ├── Commit patterns
   └── Time patterns

2. Infer preferences
   ├── Code style from samples
   ├── Naming conventions used
   └── Architectural preferences

3. Create initial profile
   ├── Expertise topology (inferred)
   ├── Work patterns (from git)
   └── Preferences (from code)
```

Output: `.planning/profile/`

## Phase 5: Learning System Init

```
1. Create learning state
   ├── Initialize feedback tracking
   ├── Set up pattern recognition
   └── Prepare adaptation mechanisms

2. Baseline metrics
   ├── Current decision confidence levels
   ├── Context prediction accuracy baseline
   └── Profile accuracy baseline
```

Output: `.planning/core/learning-state.json`

## Phase 6: Project Setup

```
1. Create PROJECT.md if not exists
   ├── Extract purpose from README
   ├── Infer goals from code structure
   └── Identify constraints from patterns

2. Create ROADMAP.md if not exists
   ├── Analyze recent work for current phase
   ├── Infer upcoming work from TODOs
   └── Identify technical debt as potential phases

3. Create STATE.md
   ├── Current position in inferred roadmap
   ├── Recent decisions
   └── Active areas
```

Output: `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`
</process>

<output_format>
## Bootstrap Report

```markdown
# GYWD v2.0 Bootstrap Complete

**Codebase:** {name}
**Mode:** {quick|standard|deep}
**Duration:** {time}

---

## Codebase Understanding

| Metric | Value |
|--------|-------|
| Files analyzed | 234 |
| Lines of code | 45,000 |
| Languages | TypeScript, Python |
| Framework | Next.js, FastAPI |

## Decision Graph

| Metric | Value |
|--------|-------|
| Decisions extracted | 67 |
| Explicit (documented) | 23 |
| Inferred (from patterns) | 44 |
| High confidence (>80%) | 34 |
| Decision chains found | 8 |
| Conflicts detected | 2 |

## Context Intelligence

| Metric | Value |
|--------|-------|
| File relationships mapped | 156 |
| Co-change patterns found | 23 |
| Context predictions ready | 45 |
| Estimated context budget | 42% |

## Developer Profile

| Dimension | Status |
|-----------|--------|
| Expertise topology | Inferred from history |
| Work patterns | Detected |
| Preferences | Baseline created |
| Ready for learning | Yes |

---

## Key Decisions Found

### Architectural
1. **DEC-001: Monorepo structure** [89%]
2. **DEC-002: API-first design** [92%]
3. **DEC-003: PostgreSQL over MongoDB** [76%]

### Conventions
1. **DEC-010: Functional React components** [95%]
2. **DEC-011: Result pattern for errors** [88%]

### Constraints
1. **DEC-020: No ORM, raw SQL only** [72%]

---

## Conflicts Detected

⚠️ **DEC-015 vs DEC-023**
- DEC-015: "Always use async/await"
- DEC-023: "Sync operations for simplicity in utils"
- Resolution needed: Clarify scope boundaries

---

## What GYWD Now Understands

✅ Why the code is structured this way
✅ What decisions led to current patterns
✅ Where conflicts and inconsistencies exist
✅ How files relate to each other
✅ What context is needed for what tasks
✅ Your working patterns (initial baseline)

---

## Next Steps

1. **Review conflicts:** `/gywd:why DEC-015` vs `/gywd:why DEC-023`
2. **Explore decisions:** `/gywd:why <any file or pattern>`
3. **Start working:** GYWD will provide decision-aware assistance
4. **Plan new work:** `/gywd:plan-phase` now understands existing decisions

---

*GYWD v2.0 is ready. Your codebase is now understood at the decision level.*
```
</output_format>

<error_handling>
## Common Issues

### No Git History
```
Warning: No git history found.
- Decision extraction limited to documentation and code patterns
- Confidence scores will be lower
- Consider initializing git and making initial commit
```

### Large Repository
```
Note: Large repository detected (>100k files)
- Using sampling strategy for initial analysis
- Full analysis available with --deep flag
- Bootstrap will take longer but be more accurate
```

### No Documentation
```
Note: Limited documentation found.
- Relying heavily on code pattern inference
- Decision confidence will be lower
- Consider adding ARCHITECTURE.md or ADRs
```
</error_handling>

<success_criteria>
- [ ] Codebase structure fully mapped
- [ ] Decision graph extracted and linked
- [ ] Context model initialized
- [ ] Developer profile created
- [ ] Learning system ready
- [ ] PROJECT.md exists (created or preserved)
- [ ] STATE.md reflects current position
- [ ] User can immediately use /gywd:why
- [ ] All v1.x commands now decision-aware
</success_criteria>
