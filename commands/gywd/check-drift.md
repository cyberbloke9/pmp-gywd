---
name: GYWD:check-drift
description: Detect specification drift between PROJECT.md and implementation
---

<objective>
Analyze the current codebase against PROJECT.md requirements to detect specification drift.

Drift types:
- **Missing**: Requirements in spec not yet implemented
- **Partial**: Requirements partially implemented
- **Divergent**: Implementation differs from spec
- **Undocumented**: Features exist that aren't in spec

Helps keep implementation aligned with original vision.
</objective>

<process>
1. Load project specification:
   - Read `.planning/PROJECT.md`
   - Extract all requirements (look for checkboxes, bullet points, "must", "should", "shall")
   - Build requirements list with IDs

2. Load implementation state:
   - Read all SUMMARY.md files for completed work
   - Read current codebase structure (file listing)
   - Extract implemented features from summaries

3. Cross-reference analysis:

   **For each requirement:**
   - Search summaries for related completions
   - Check if implementation exists in codebase
   - Categorize: Complete | Partial | Missing | Unknown

   **For each implemented feature:**
   - Check if documented in PROJECT.md
   - If not: Flag as potentially undocumented

4. Generate drift report:
   ```
   ## Specification Drift Analysis

   **Project:** {name}
   **Spec Date:** {PROJECT.md last modified}
   **Analysis Date:** {today}

   ---

   ### Alignment Score: 78%

   [████████░░] 78% of requirements implemented

   ---

   ### Requirement Status

   | # | Requirement | Status | Notes |
   |---|-------------|--------|-------|
   | R1 | User authentication | ✅ Complete | Phase 1 |
   | R2 | OAuth integration | 🟡 Partial | Google done, GitHub pending |
   | R3 | Admin dashboard | ❌ Missing | Not started |
   | R4 | API rate limiting | ✅ Complete | Phase 2 |
   | R5 | Email notifications | ❌ Missing | Deferred |

   ---

   ### Potential Drift

   ⚠️ **Divergent Implementation:**
   - R2 (OAuth): Spec says "all major providers", only Google implemented

   ⚠️ **Undocumented Features:**
   - WebSocket real-time updates (not in PROJECT.md)
   - Redis caching layer (not in PROJECT.md)

   ---

   ### Recommendations

   1. **Update PROJECT.md** to include:
      - WebSocket feature (if intentional)
      - Redis caching decision

   2. **Plan missing requirements:**
      - R3: Admin dashboard - add to next phase?
      - R5: Email notifications - still needed?

   3. **Clarify partial:**
      - R2: Define which OAuth providers are MVP vs future

   ---

   ### Quick Actions

   - `/gywd:add-phase "Admin dashboard"` - Add missing requirement
   - `/gywd:consider-issues` - Review deferred items
   - Edit PROJECT.md to update requirements
   ```

5. Provide actionable recommendations based on drift severity:
   - Minor drift (>80% aligned): Suggestions only
   - Moderate drift (60-80%): Recommend spec update
   - Major drift (<60%): Recommend alignment review session
</process>

<detection_patterns>
**Requirement extraction from PROJECT.md:**
- Lines starting with `- [ ]` or `- [x]`
- Lines containing "must", "should", "shall", "will"
- Sections titled "Requirements", "Features", "Goals"
- Numbered lists in requirements sections

**Implementation detection:**
- SUMMARY.md "Completed" sections
- File existence checks for mentioned modules
- Package.json dependencies
- Config files indicating features
</detection_patterns>

<output_format>
Structured report with:
- Alignment score percentage and visual bar
- Table of all requirements with status
- List of potential drift issues
- Actionable recommendations
- Quick action commands

Status indicators:
- ✅ Complete - Fully implemented
- 🟡 Partial - Partially done
- ❌ Missing - Not started
- ⚠️ Divergent - Differs from spec
- ❓ Unknown - Can't determine
</output_format>

<success_criteria>
- [ ] Extracts requirements from PROJECT.md
- [ ] Cross-references with implementation
- [ ] Calculates alignment percentage
- [ ] Identifies missing requirements
- [ ] Flags undocumented features
- [ ] Provides actionable recommendations
</success_criteria>
