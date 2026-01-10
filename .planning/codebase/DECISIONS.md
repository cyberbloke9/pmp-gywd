# Decision Graph: PMP-GYWD

**Extracted:** 2026-01-10
**Depth:** Standard
**Decisions:** 12
**Confidence Avg:** 91.5%

---

## Architectural Decisions

### DEC-001: Fork and rebrand get-shit-done as PMP-GYWD [95%]

**Summary:** Create an independent, professionally-named version while preserving the core context engineering approach

**Alternatives Considered:**
- Build from scratch - Rejected: Would lose proven patterns and take significantly longer
- Contribute to original - Rejected: Wanted independent control over direction and branding

**Trade-offs:**
- Gained: Full ownership, Professional naming, Custom direction
- Sacrificed: Upstream updates, Community contributions

**Source:** Explicit (commit aad18745)

---

### DEC-003: Zero runtime dependencies - Node.js built-ins only [95%]

**Summary:** Reduce installation friction, eliminate supply chain risk, maximize compatibility

**Alternatives Considered:**
- Use commander.js for CLI - Rejected: Adds dependency for minimal benefit
- Use chalk for colors - Rejected: ANSI codes work natively

**Trade-offs:**
- Gained: Zero supply chain risk, Fast installation, No version conflicts
- Sacrificed: Some developer convenience, Advanced CLI features

**Source:** Inferred from package.json and bin/install.js

---

### DEC-004: Markdown files as executable prompts, not documentation [98%]

**Summary:** Commands ARE prompts - Claude interprets them directly without compilation

**Alternatives Considered:**
- JSON-based command definitions - Rejected: Less readable, harder to maintain
- TypeScript command handlers - Rejected: Adds build step, violates zero-dep principle

**Trade-offs:**
- Gained: Human readable, No build step, Easy to modify, Self-documenting
- Sacrificed: Type safety, IDE autocompletion

**Source:** Inferred from commands/gywd/ structure

---

### DEC-005: Three-layer architecture: Commands -> Workflows -> Templates/References [90%]

**Summary:** Separation of concerns: WHAT (commands) vs HOW (workflows) vs FORMAT (templates)

**Alternatives Considered:**
- Monolithic command files - Rejected: Would lead to duplication and maintenance burden

**Trade-offs:**
- Gained: Reusable workflows, Consistent output, Maintainable codebase
- Sacrificed: More files to navigate, Indirection complexity

**Source:** Inferred from get-your-work-done/ organization

---

### DEC-006: File-based state management via .planning/ directory [95%]

**Summary:** Enable session persistence without external databases, git-trackable state

**Alternatives Considered:**
- SQLite database - Rejected: Adds complexity, not human-readable
- Environment variables - Rejected: Lost between sessions

**Trade-offs:**
- Gained: Human readable, Git trackable, Session persistence, No external deps
- Sacrificed: Query performance, Structured relationships

**Source:** Inferred from .planning/ structure

---

### DEC-009: Decision Intelligence as core paradigm (v1.4.0) [95%]

**Summary:** Code is crystallized decisions - understanding WHY beats understanding WHAT

**Alternatives Considered:**
- Continue feature accumulation - Rejected: Diminishing returns, no competitive moat
- Focus on execution speed - Rejected: Doesn't address decision coherence problem

**Trade-offs:**
- Gained: Unique value proposition, Decision coherence, Why queries
- Sacrificed: Complexity increase, Learning curve

**Source:** Explicit (commit d4a393bc, VISION.md)

---

### DEC-010: Unified Intelligence System (v2.0.0) [90%]

**Summary:** All systems work as cognitive whole: Decision Graph + Context Intelligence + Agent Orchestration + Continuous Learning

**Alternatives Considered:**
- Keep systems separate - Rejected: Loses emergent intelligence from integration

**Trade-offs:**
- Gained: Emergent intelligence, Coherent behavior, Learning loop
- Sacrificed: Complexity, Tight coupling between systems

**Source:** Explicit (commit 18926c15, architecture.md)

---

## Convention Decisions

### DEC-002: Use GYWD prefix for all commands instead of GSD [92%]

**Summary:** Professional naming that aligns with 'Get Your Work Done' branding

**Source:** Explicit (commit b17d2163)

---

### DEC-007: Jest for testing with node environment [88%]

**Summary:** Industry standard, minimal configuration, good coverage reporting

**Source:** Explicit (commit b1fc0ab1)

---

### DEC-011: Adversarial agents for plan/code review [88%]

**Summary:** Competing perspectives catch flaws, argue alternatives, find edge cases

**Agents:** Critic, Devil's Advocate, Red Team, Chaos, Skeptic

**Source:** Explicit (commands/gywd/challenge.md)

---

## Constraint Decisions

### DEC-012: Fresh 200k context per plan execution [92%]

**Summary:** Prevent context degradation, enable unbounded project scope

**Trade-offs:**
- Gained: Consistent quality, Unlimited project size, Clean slate
- Sacrificed: Context handoff overhead, Some continuity

**Source:** Inferred from principles.md

---

## Decision Chains

```
DEC-001 (Fork) → DEC-002 (GYWD naming)
DEC-003 (Zero deps) → DEC-004 (Markdown as prompts)
DEC-004 (Markdown prompts) → DEC-005 (Three-layer arch)
DEC-006 (File state) → DEC-012 (Fresh context)
DEC-008 (Tiered dev) → DEC-009 (Decision Intelligence) → DEC-010 (Unified v2.0)
DEC-009 (Decision Intelligence) → DEC-011 (Adversarial agents)
```

---

## Conflicts

None detected.

---

*Generated by GYWD v2.0 Bootstrap*
