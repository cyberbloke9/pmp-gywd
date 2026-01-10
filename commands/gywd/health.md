---
name: GYWD:health
description: Phase health dashboard showing quality metrics
---

<objective>
Display a comprehensive health dashboard for the current project showing:
- Plan quality metrics
- Test coverage status
- Open issues per phase
- Completion velocity
- Risk indicators

Helps users identify problems before they become blockers.
</objective>

<process>
1. Check project exists:
   - If no `.planning/`: "No GYWD project. Run /gywd:new-project first."

2. Gather metrics from each source:

   **From ROADMAP.md:**
   - Total phases and completion status
   - Plans per phase

   **From STATE.md:**
   - Current position
   - Decisions made
   - Deferred issues

   **From ISSUES.md (if exists):**
   - Open issue count
   - Issues per phase
   - Issue severity breakdown

   **From SUMMARY.md files:**
   - Completed tasks
   - Deviation count
   - Time patterns (if timestamps exist)

   **From codebase (if accessible):**
   - Test file count vs source file count
   - Package.json test script presence

3. Calculate health scores:

   **Plan Quality Score (0-100):**
   - Has verification steps: +25
   - Has success criteria: +25
   - Reasonable task count (3-8): +25
   - Clear task descriptions: +25

   **Test Coverage Indicator:**
   - Test files exist: ✅
   - Test script in package.json: ✅
   - No tests detected: ⚠️

   **Issue Health:**
   - 0 open issues: ✅ Clean
   - 1-3 issues: 🟡 Minor debt
   - 4-7 issues: 🟠 Needs attention
   - 8+ issues: 🔴 Technical debt risk

4. Generate dashboard:
   ```
   ## Project Health Dashboard

   **Project:** {project-name}
   **Phase:** 3/7 (Core Features)
   **Overall Health:** 🟢 Good (85/100)

   ---

   ### Phase Status

   | Phase | Plans | Tasks | Issues | Health |
   |-------|-------|-------|--------|--------|
   | 1. Foundation | 2/2 ✅ | 12/12 | 0 | 🟢 |
   | 2. Auth | 1/1 ✅ | 8/8 | 1 | 🟢 |
   | 3. Core ← | 1/2 🔄 | 5/10 | 2 | 🟡 |
   | 4. API | 0/1 📋 | 0/? | 0 | ⬜ |
   | 5. UI | 0/2 📋 | 0/? | 0 | ⬜ |

   ---

   ### Quality Metrics

   | Metric | Status | Details |
   |--------|--------|---------|
   | Test Coverage | ✅ | 15 test files found |
   | Plan Quality | 🟢 92% | All plans have criteria |
   | Issue Backlog | 🟡 3 open | 2 in current phase |
   | Velocity | → Stable | ~5 tasks/plan average |

   ---

   ### Attention Needed

   ⚠️ **2 issues in current phase:**
   - #12: Auth token refresh edge case
   - #15: Error handling in user service

   💡 **Recommendation:**
   Consider addressing Phase 3 issues before moving to Phase 4.
   Run `/gywd:consider-issues` for detailed analysis.

   ---

   ### Quick Actions

   - `/gywd:progress` - Continue current work
   - `/gywd:consider-issues` - Review open issues
   - `/gywd:context` - Check context budget
   ```

5. Provide actionable recommendations based on health:
   - Low plan quality → Suggest plan review
   - High issue count → Suggest issue triage
   - No tests → Suggest adding test phase
   - Slow velocity → Suggest smaller tasks
</process>

<output_format>
Dashboard-style output with:
- Overall health score and indicator
- Phase-by-phase breakdown table
- Quality metrics table
- Attention items (if any)
- Quick action commands

Use consistent indicators:
- 🟢 Good/Complete
- 🟡 Minor issues
- 🟠 Needs attention
- 🔴 Critical
- ⬜ Not started
- 🔄 In progress
- ✅ Complete
- ← Current phase indicator
</output_format>

<success_criteria>
- [ ] Shows overall health score
- [ ] Displays phase-by-phase breakdown
- [ ] Identifies issues in current phase
- [ ] Provides quality metrics
- [ ] Gives actionable recommendations
- [ ] Runs without modifying any files
</success_criteria>
