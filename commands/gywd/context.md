---
name: GYWD:context
description: Show context budget visibility and usage analysis
---

<objective>
Display context budget analysis to help users understand their context consumption and prevent the "context cliff" that kills productivity.

Shows:
- Current estimated context usage
- Context breakdown by file type
- Recommendations for optimization
- Warning thresholds
</objective>

<process>
1. Check if `.planning/` exists
   - If not: Output "No GYWD project. Run /gywd:new-project first."

2. Analyze context sources:

   **Planning Files:**
   - Count lines in .planning/*.md files
   - Count lines in .planning/phases/**/*.md files
   - Count lines in .planning/codebase/*.md (if exists)

   **Estimate token usage:**
   - Rough estimate: 1 line ≈ 10-15 tokens average
   - Planning docs: Count total lines × 12
   - Code context: If codebase mapped, count those lines × 10

3. Calculate budget breakdown:
   ```
   Claude Code context window: ~200,000 tokens

   Breakdown:
   - System prompts & tools: ~15,000 tokens (reserved)
   - Conversation history: Variable
   - Available for project: ~185,000 tokens
   ```

4. Generate visual output:
   ```
   ## Context Budget Analysis

   **Estimated Usage:**
   [████████░░░░░░░░░░░░] 42% (~78,000 / 185,000 tokens)

   **Breakdown:**
   | Source | Lines | Est. Tokens | % |
   |--------|-------|-------------|---|
   | PROJECT.md | 45 | 540 | 0.3% |
   | ROADMAP.md | 120 | 1,440 | 0.8% |
   | STATE.md | 80 | 960 | 0.5% |
   | Phase Plans | 450 | 5,400 | 2.9% |
   | Codebase Maps | 2,100 | 21,000 | 11.4% |
   | Code Files (est.) | 4,000 | 48,000 | 26.0% |

   **Status:** ✅ Healthy

   **Recommendations:**
   - None needed at current usage
   ```

5. Show warnings if needed:
   - 0-50%: ✅ Healthy - "Plenty of headroom"
   - 50-70%: ⚠️ Moderate - "Consider summarizing older plans"
   - 70-85%: 🟠 High - "Archive completed phases to reduce load"
   - 85%+: 🔴 Critical - "Risk of context degradation. Archive now."

6. If high usage, suggest actions:
   - "Run /gywd:complete-milestone to archive"
   - "Delete old SUMMARY.md files after review"
   - "Consider running /gywd:digest instead of full codebase map"
</process>

<output_format>
Clean, visual output with:
- Progress bar showing usage
- Table breakdown by source
- Status indicator (emoji + text)
- Actionable recommendations if needed

Keep output concise - this is a quick check, not a report.
</output_format>

<success_criteria>
- [ ] Shows estimated context usage percentage
- [ ] Breaks down by source type
- [ ] Provides clear status indicator
- [ ] Gives actionable recommendations when needed
- [ ] Executes quickly (< 5 seconds)
</success_criteria>
