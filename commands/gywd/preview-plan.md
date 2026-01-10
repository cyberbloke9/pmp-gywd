---
name: GYWD:preview-plan
description: Preview what a plan will do before executing it
argument-hint: "[path-to-PLAN.md]"
---

<objective>
Show a detailed preview of what a plan will do BEFORE execution.

Builds trust by letting users see:
- All tasks that will be executed
- Files that will be created/modified
- Commands that will be run
- Checkpoints where execution will pause
- Estimated complexity and risk

This is a READ-ONLY operation. No changes are made.
</objective>

<context>
Plan path: $ARGUMENTS

If no path provided, auto-detect current plan:
1. Read STATE.md for current phase
2. Find next unexecuted plan in that phase
3. Use that plan path
</context>

<process>
1. Locate plan file:
   - If $ARGUMENTS provided: Use that path
   - If not: Auto-detect from STATE.md
   - If no plan found: Error with helpful message

2. Read and parse the plan:
   - Extract plan name and description
   - Parse all tasks with their details
   - Identify checkpoints (verify/decision)
   - Note any dependencies mentioned

3. Analyze each task for:
   **File Operations:**
   - Files to create (look for "create", "add", "new")
   - Files to modify (look for "update", "edit", "change")
   - Files to delete (look for "remove", "delete")

   **Commands:**
   - Shell commands mentioned (npm, git, etc.)
   - Test commands
   - Build commands

   **Risk Indicators:**
   - Database migrations
   - Config changes
   - Dependency updates
   - Breaking changes mentioned

4. Generate execution preview:
   ```
   ## Plan Preview: {plan-name}

   **Path:** .planning/phases/01-foundation/01-01-PLAN.md
   **Tasks:** 5 tasks, 1 checkpoint
   **Estimated Complexity:** Medium

   ---

   ### Execution Order

   1. ☐ **Create user model**
      - Creates: src/models/user.ts
      - Creates: src/models/user.test.ts

   2. ☐ **Add authentication middleware**
      - Creates: src/middleware/auth.ts
      - Modifies: src/app.ts

   3. ⏸️ **CHECKPOINT: Verify tests pass**
      - Execution will pause here for verification

   4. ☐ **Implement login endpoint**
      - Creates: src/routes/auth.ts
      - Commands: npm test

   5. ☐ **Update documentation**
      - Modifies: README.md

   ---

   ### Summary

   | Action | Count |
   |--------|-------|
   | Files Created | 4 |
   | Files Modified | 2 |
   | Commands Run | 1 |
   | Checkpoints | 1 |

   ### Risk Assessment

   ✅ No high-risk operations detected

   ---

   Ready to execute? Run:
   /gywd:execute-plan {plan-path}
   ```

5. Highlight any concerns:
   - ⚠️ for medium-risk operations
   - 🔴 for high-risk operations (migrations, breaking changes)
   - Suggest review steps for risky operations
</process>

<output_format>
Structured preview showing:
- Plan metadata (path, task count, complexity)
- Ordered task list with file operations
- Clear checkpoint indicators
- Summary table
- Risk assessment
- Next step command

Use emojis for visual scanning:
- ☐ = pending task
- ⏸️ = checkpoint
- ✅ = safe operation
- ⚠️ = needs attention
- 🔴 = high risk
</output_format>

<success_criteria>
- [ ] Parses plan without executing anything
- [ ] Shows all tasks in execution order
- [ ] Identifies file creates/modifies
- [ ] Highlights checkpoints clearly
- [ ] Provides risk assessment
- [ ] Shows clear next step
</success_criteria>
