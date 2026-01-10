---
name: GYWD:status
description: Quick one-line project status check
---

<objective>
Display a quick, single-line project status without verbose output.

Perfect for checking where you are at a glance.
</objective>

<process>
1. Check if `.planning/` directory exists
   - If not: Output "No GYWD project initialized. Run /gywd:new-project to start."

2. Check if `.planning/STATE.md` exists
   - If not: Output "Project exists but no state. Run /gywd:create-roadmap."

3. Read STATE.md and extract:
   - Current phase number and name
   - Overall progress percentage
   - Last activity

4. Output single-line status in format:
   ```
   [██████░░░░] 60% | Phase 3/5: Core Features | Last: 2 hours ago
   ```

5. If issues exist in ISSUES.md, append count:
   ```
   [██████░░░░] 60% | Phase 3/5: Core Features | 3 issues pending
   ```
</process>

<output_format>
Single line. No headers. No suggestions. Just status.

Examples:
- `[░░░░░░░░░░] 0% | Not started | Run /gywd:new-project`
- `[████░░░░░░] 40% | Phase 2/5: Authentication | Last: today`
- `[██████████] 100% | Complete | Ready for /gywd:complete-milestone`
</output_format>
