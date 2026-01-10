---
name: GYWD:extract-decisions
description: Extract decision graph from codebase history
argument-hint: "[--depth shallow|deep] [--since <date>] [--path <dir>]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Glob
  - Grep
  - Task
---

<objective>
Parse git history, PR descriptions, code comments, and documentation to extract a **decision graph** - a structured representation of WHY code exists, not just WHAT it does.

This is the foundation for decision-aware AI assistance.
</objective>

<philosophy>
Code is not text. Code is crystallized decisions.

Every line represents:
- A decision made with context we may have lost
- Trade-offs that were considered
- Alternatives that were rejected
- Constraints that were respected

By extracting these decisions explicitly, we enable:
- "Why does this exist?" queries with real answers
- Change impact analysis based on decision dependencies
- Drift detection between intent and implementation
- AI suggestions that respect decision coherence
</philosophy>

<decision_schema>
Each extracted decision follows this structure:

```yaml
decision:
  id: "DEC-001"
  title: "Use Result<T,E> pattern for error handling"
  type: "architectural|implementation|convention|constraint"

  # When and who
  date: "2024-03-15"
  author: "@developer"
  source: "commit:abc123|pr:47|comment:file.ts:42|doc:ARCHITECTURE.md"

  # The decision itself
  choice: "Adopted Result pattern from utils/result.ts"
  context: "Needed error propagation without exceptions in async code"

  # What was considered
  alternatives:
    - option: "try-catch blocks"
      rejected_because: "Verbose, loses type information"
    - option: "null returns"
      rejected_because: "Ambiguous, null means multiple things"

  trade_offs:
    - gain: "Type-safe error handling"
      cost: "More verbose call sites"
    - gain: "Explicit error paths"
      cost: "Learning curve for new developers"

  # Confidence in extraction
  confidence: 94  # percent
  confidence_factors:
    - "Explicitly documented in PR description (+40)"
    - "Consistent usage across codebase (+30)"
    - "Author comment explaining rationale (+24)"

  # What this affects
  affects:
    files: ["src/services/*.ts", "src/utils/result.ts"]
    decisions: ["DEC-003", "DEC-007"]  # downstream
    depends_on: ["DEC-000"]  # upstream

  # Metadata
  status: "active|superseded|reverted"
  superseded_by: null
  tags: ["error-handling", "typescript", "patterns"]
```
</decision_schema>

<extraction_sources>
## Source Priority (highest to lowest confidence)

### 1. Explicit Documentation (90-100% confidence)
- Architecture Decision Records (ADRs)
- DECISIONS.md or similar files
- Inline comments with "Decision:", "Why:", "Rationale:"
- PR descriptions with explicit reasoning

### 2. Commit Messages (60-85% confidence)
- Commits starting with "feat:", "refactor:", "fix:"
- Commit bodies explaining reasoning
- Breaking change annotations
- References to issues/discussions

### 3. Code Patterns (40-70% confidence)
- Consistent usage implying convention
- Deviation from language defaults
- Custom abstractions that replace standard patterns
- Configuration choices

### 4. Temporal Inference (30-50% confidence)
- Refactoring patterns (A→B→C evolution)
- Reverted commits (tried and rejected)
- File co-evolution (always changed together)
</extraction_sources>

<process>
## Phase 1: Source Collection

1. **Parse arguments:**
   - `--depth shallow`: Last 100 commits only
   - `--depth deep`: Full history (default)
   - `--since <date>`: Start from date
   - `--path <dir>`: Focus on specific directory

2. **Gather explicit sources:**
   ```bash
   # Find ADRs and decision docs
   find . -name "*.md" | xargs grep -l -i "decision\|rationale\|why we"

   # Find annotated comments
   grep -r "Decision:\|Why:\|Rationale:\|DECISION:" --include="*.ts" --include="*.js" --include="*.py"
   ```

3. **Parse git history:**
   ```bash
   # Commits with context
   git log --format="%H|%an|%ad|%s" --date=short

   # PR merge commits
   git log --merges --format="%H|%s|%b"

   # Refactoring commits
   git log --grep="refactor" --format="%H|%s|%b"
   ```

## Phase 2: Decision Extraction

For each source, use LLM to extract structured decisions:

**Prompt template:**
```
Analyze this [commit/PR/comment/doc] and extract any decisions made.

Source:
{content}

For each decision found, provide:
1. What was decided
2. Why (context, constraints, goals)
3. What alternatives were considered (if mentioned)
4. What trade-offs were accepted (if mentioned)
5. Confidence level in this extraction (1-100)

Focus on:
- Architectural choices (patterns, structures, dependencies)
- Convention choices (naming, organization, style)
- Technology choices (libraries, tools, frameworks)
- Constraint choices (what we deliberately don't do)
```

## Phase 3: Graph Construction

1. **Link decisions:**
   - Parse "affects" from file paths
   - Detect decision dependencies (A required B)
   - Find supersession chains (A replaced by B)

2. **Calculate aggregate confidence:**
   - Multiple sources confirming = higher confidence
   - Contradictory sources = flag for review
   - No sources but strong pattern = inferred decision

3. **Identify gaps:**
   - Code with no traceable decisions
   - Decisions with no code (orphaned)
   - Conflicting decisions

## Phase 4: Output Generation

Create `.planning/decisions/` structure:

```
.planning/decisions/
├── DECISIONS.md          # Human-readable summary
├── decision-graph.json   # Machine-readable graph
├── confidence-report.md  # Extraction quality metrics
└── gaps.md              # Identified gaps for review
```
</process>

<output_format>
## DECISIONS.md Structure

```markdown
# Decision Graph: {project-name}

**Extracted:** {date}
**Commits analyzed:** {count}
**Decisions found:** {count}
**Average confidence:** {percent}

---

## Architectural Decisions

### DEC-001: Result Pattern for Error Handling [94%]

**Decided:** 2024-03-15 by @developer
**Source:** PR #47, commit abc123

**Choice:** Use `Result<T,E>` pattern from `utils/result.ts`

**Context:**
> Needed error propagation without exceptions. Async code made try-catch unwieldy.

**Alternatives Considered:**
| Option | Rejected Because |
|--------|------------------|
| try-catch | Verbose, loses type info |
| null returns | Ambiguous semantics |

**Trade-offs:**
- ✅ Type-safe errors
- ✅ Explicit error paths
- ⚠️ Verbose call sites
- ⚠️ Learning curve

**Affects:** 47 files in src/services/, src/utils/

---

### DEC-002: ...

---

## Convention Decisions

### DEC-010: ...

---

## Inferred Decisions (Lower Confidence)

These decisions were inferred from patterns, not explicit sources.
Review recommended.

### DEC-050: Barrel exports in each module [45%]

**Inferred from:** Consistent pattern across 23 modules
**No explicit source found**

---

## Decision Gaps

The following code areas have no traceable decisions:

| Path | Lines | Risk |
|------|-------|------|
| src/legacy/ | 2,400 | High - no history |
| src/utils/crypto.ts | 180 | Medium - security-sensitive |

---

## Graph Statistics

- Total decisions: 67
- Architectural: 12
- Implementation: 34
- Convention: 15
- Constraint: 6

- High confidence (>80%): 23
- Medium confidence (50-80%): 31
- Low confidence (<50%): 13

- Decision chains (A→B→C): 8
- Superseded decisions: 5
- Reverted decisions: 2
```
</output_format>

<integration>
## How Decision Graph Integrates with GYWD

### During Planning (/gywd:plan-phase)
- Load relevant decisions for the phase
- Ensure plan respects existing decisions
- Flag when plan conflicts with decisions
- Suggest decisions to document

### During Execution (/gywd:execute-plan)
- Validate changes against decision constraints
- Auto-document new decisions from commits
- Detect decision drift

### During Review (/gywd:challenge)
- Adversarial agents reference decisions
- "This violates DEC-012" as concrete feedback
- Decision coherence scoring

### Queries
- `/gywd:why <file/function>` → Trace to decisions
- `/gywd:impact <decision>` → Show downstream effects
- `/gywd:conflicts` → Find contradictory decisions
</integration>

<success_criteria>
- [ ] Parses git history for decision signals
- [ ] Extracts ADRs and explicit documentation
- [ ] Infers decisions from code patterns
- [ ] Calculates confidence scores
- [ ] Links decisions into graph structure
- [ ] Creates queryable DECISIONS.md
- [ ] Identifies gaps for review
- [ ] Generates machine-readable JSON
</success_criteria>
