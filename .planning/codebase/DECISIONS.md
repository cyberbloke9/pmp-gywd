# Decision Graph: PMP-GYWD

**Extracted:** 2026-02-01
**Depth:** Standard
**Decisions:** 22
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

### DEC-013: Modular lib architecture (v3.0.0) [92%]

**Summary:** Organize intelligence systems into discrete, testable modules under lib/

**Alternatives Considered:**
- Inline everything in commands - Rejected: Untestable, duplicative
- Single monolithic library - Rejected: Poor separation of concerns

**Trade-offs:**
- Gained: Testability, Reusability, Clear boundaries
- Sacrificed: More files, Import complexity

**Source:** Explicit (lib/ directory structure)

---

### DEC-014: Bayesian confidence scoring (v3.2.0) [88%]

**Summary:** Use Beta-Binomial Bayesian updating for statistically rigorous confidence

**Alternatives Considered:**
- Simple percentage - Rejected: No uncertainty quantification
- Frequentist confidence intervals - Rejected: Requires more samples

**Trade-offs:**
- Gained: Statistically sound, Handles sparse data, Uncertainty bounds
- Sacrificed: Implementation complexity, Less intuitive to users

**Source:** Explicit (lib/memory/confidence-calibrator.js)

---

### DEC-015: Team sync via exports (v3.2.0) [90%]

**Summary:** Async collaboration through JSON exports rather than real-time sync

**Alternatives Considered:**
- Real-time WebSocket sync - Rejected: Infrastructure complexity, always-on requirement
- Git-based sync - Rejected: Merge conflicts in binary patterns

**Trade-offs:**
- Gained: No infrastructure, Works offline, Simple mental model
- Sacrificed: No real-time updates, Manual export/import

**Source:** Explicit (lib/memory/team-sync.js)

---

### DEC-016: Agent pattern for autonomous operations (v4.0.0) [94%]

**Summary:** Implement specialized agents with lifecycle management for composable autonomous operations

**Alternatives Considered:**
- Simple function calls - Rejected: No state management, poor composition
- External agent frameworks - Rejected: Violates zero-dep principle

**Trade-offs:**
- Gained: Composable operations, State management, Clear lifecycle
- Sacrificed: Implementation complexity, Learning curve

**Source:** Explicit (lib/agents/)

---

### DEC-017: Permission risk scoring (v4.0.0) [91%]

**Summary:** Multi-factor risk scoring to auto-approve safe operations and route dangerous ones

**Alternatives Considered:**
- Binary allow/deny - Rejected: Too coarse, poor UX
- Always ask user - Rejected: Friction for safe operations

**Trade-offs:**
- Gained: Smooth UX for safe ops, Protection for dangerous ops
- Sacrificed: Potential false positives, Threshold tuning needed

**Source:** Explicit (lib/permissions/)

---

### DEC-018: Self-grilling with "5 Whys" (v4.0.0) [89%]

**Summary:** Use established root cause analysis techniques for decision validation

**Alternatives Considered:**
- Simple yes/no validation - Rejected: Doesn't probe assumptions
- Full devil's advocate debate - Rejected: Too heavyweight for every decision

**Trade-offs:**
- Gained: Deep assumption probing, Structured analysis
- Sacrificed: Time overhead, May feel interrogative

**Source:** Explicit (lib/grilling/decision-griller.js)

---

### DEC-019: Plugin sandboxing (v4.0.0) [87%]

**Summary:** Limited API surface for plugins with validation and error boundaries

**Alternatives Considered:**
- No plugins - Rejected: Limits extensibility
- Full access plugins - Rejected: Security risk

**Trade-offs:**
- Gained: Extensibility, Security boundaries
- Sacrificed: Plugin capabilities limited, Some overhead

**Source:** Explicit (lib/plugins/plugin-loader.js)

---

### DEC-020: ASCII dashboard over web UI (v4.0.0) [93%]

**Summary:** Terminal-native ASCII dashboard maintains CLI-first philosophy

**Alternatives Considered:**
- Web UI dashboard - Rejected: Browser dependency, separate process
- No dashboard - Rejected: Poor visibility into system state

**Trade-offs:**
- Gained: Zero external deps, Works in any terminal, Fast
- Sacrificed: Limited interactivity, No charts/graphs beyond ASCII

**Source:** Explicit (lib/dashboard/dashboard-renderer.js)

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

**Source:** Explicit (commands/gywd/challenge.md, lib/agents/)

---

## Constraint Decisions

### DEC-012: Fresh 200k context per plan execution [92%]

**Summary:** Prevent context degradation, enable unbounded project scope

**Trade-offs:**
- Gained: Consistent quality, Unlimited project size, Clean slate
- Sacrificed: Context handoff overhead, Some continuity

**Source:** Inferred from principles.md

---

### DEC-021: Multi-agent coordination modes (v4.0.0) [90%]

**Summary:** Support consensus, majority, leader, and round-robin coordination strategies

**Alternatives Considered:**
- Single coordination mode - Rejected: Different scenarios need different strategies
- User-defined coordination - Rejected: Too complex for most users

**Trade-offs:**
- Gained: Flexibility, Appropriate mode per scenario
- Sacrificed: More modes to understand, Selection complexity

**Source:** Explicit (lib/multi-agent/coordinator.js)

---

### DEC-022: Conflict resolution strategies for sync (v4.0.0) [88%]

**Summary:** Local wins, remote wins, merge, and manual strategies for sync conflicts

**Alternatives Considered:**
- Always overwrite - Rejected: Data loss risk
- Always manual - Rejected: Friction for simple cases

**Trade-offs:**
- Gained: Appropriate handling per scenario, User control
- Sacrificed: Strategy selection complexity

**Source:** Explicit (lib/multi-agent/cloud-sync.js)

---

## Decision Chains

```
DEC-001 (Fork) → DEC-002 (GYWD naming)
DEC-003 (Zero deps) → DEC-004 (Markdown as prompts) → DEC-020 (ASCII dashboard)
DEC-004 (Markdown prompts) → DEC-005 (Three-layer arch)
DEC-006 (File state) → DEC-012 (Fresh context)
DEC-008 (Tiered dev) → DEC-009 (Decision Intelligence) → DEC-010 (Unified v2.0)
DEC-009 (Decision Intelligence) → DEC-011 (Adversarial agents) → DEC-016 (Agent pattern)
DEC-010 (Unified v2.0) → DEC-013 (Modular lib) → DEC-014 (Bayesian) + DEC-015 (Team sync)
DEC-016 (Agent pattern) → DEC-017 (Permission scoring) + DEC-018 (Self-grilling)
DEC-016 (Agent pattern) → DEC-021 (Multi-agent modes) → DEC-022 (Conflict strategies)
DEC-013 (Modular lib) → DEC-019 (Plugin sandboxing)
```

---

## Conflicts

None detected.

---

*Generated by GYWD v4.0.0*
