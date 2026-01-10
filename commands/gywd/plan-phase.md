---
name: GYWD:plan-phase
description: Create detailed execution plan for a phase (PLAN.md)
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Glob
  - Grep
  - AskUserQuestion
  - WebFetch
  - mcp__context7__*
---

<objective>
Create executable phase prompt with discovery, context injection, and task breakdown.

Purpose: Break down roadmap phases into concrete, executable PLAN.md files that Claude can execute.
Output: One or more PLAN.md files in the phase directory (.planning/phases/XX-name/{phase}-{plan}-PLAN.md)
</objective>

<execution_context>
@~/.claude/get-your-work-done/workflows/plan-phase.md
@~/.claude/get-your-work-done/templates/phase-prompt.md
@~/.claude/get-your-work-done/references/plan-format.md
@~/.claude/get-your-work-done/references/scope-estimation.md
@~/.claude/get-your-work-done/references/checkpoints.md
@~/.claude/get-your-work-done/references/tdd.md
@~/.claude/get-your-work-done/references/confidence-scoring.md
</execution_context>

<context>
Phase number: $ARGUMENTS (optional - auto-detects next unplanned phase if not provided)

**Load project state first:**
@.planning/STATE.md

**Load roadmap:**
@.planning/ROADMAP.md

**Load phase context if exists (created by /gywd:discuss-phase):**
Check for and read `.planning/phases/XX-name/{phase}-CONTEXT.md` - contains research findings, clarifications, and decisions from phase discussion.

**Load codebase context if exists:**
Check for `.planning/codebase/` and load relevant documents based on phase type.
</context>

<process>
1. Check .planning/ directory exists (error if not - user should run /gywd:new-project)
2. If phase number provided via $ARGUMENTS, validate it exists in roadmap
3. If no phase number, detect next unplanned phase from roadmap
4. Follow plan-phase.md workflow:
   - Load project state and accumulated decisions
   - Perform mandatory discovery (Level 0-3 as appropriate)
   - Read project history (prior decisions, issues, concerns)
   - Break phase into tasks
   - Estimate scope and split into multiple plans if needed
   - Create PLAN.md file(s) with executable structure
</process>

<success_criteria>
- [ ] One or more PLAN.md files created in .planning/phases/XX-name/
- [ ] Each plan has: objective, execution_context, context, tasks, verification, success_criteria, output
- [ ] Tasks are specific enough for Claude to execute
- [ ] **Confidence scores included:**
  - Overall plan confidence percentage
  - Per-task confidence scores
  - Low-confidence tasks flagged (< 70%)
  - Factors affecting confidence listed
- [ ] User knows next steps (execute plan or review/adjust)
</success_criteria>

<confidence_requirements>
Every PLAN.md must include a confidence summary:

```markdown
## Confidence Summary

**Overall: XX%** (High/Moderate/Low)

| Task | Confidence | Notes |
|------|------------|-------|
| T1 | 95% | Standard pattern |
| T2 | 72% | Multiple approaches possible |
| T3 | 58% | ⚠️ Needs clarification |

**Low-confidence items require review before execution.**
```

See confidence-scoring.md reference for calculation guidelines.
</confidence_requirements>
