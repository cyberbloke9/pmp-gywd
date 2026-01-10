---
name: GYWD:digest
description: Create a compact codebase digest for quick context refresh
argument-hint: "[optional: focus-area]"
---

<objective>
Generate a compact, focused codebase summary optimized for context efficiency.

Unlike `/gywd:map-codebase` which creates comprehensive documentation, `/gywd:digest` creates a minimal summary focused on:
- Key entry points
- Critical patterns
- Recent changes
- Active areas

Use when:
- Resuming work after a break
- Context is getting heavy
- Need quick orientation
- Working on specific area
</objective>

<context>
Focus area: $ARGUMENTS (optional)

If provided, digest focuses on that area of the codebase.
Examples: "auth", "api", "frontend", "database"
</context>

<process>
1. If focus area provided:
   - Scope digest to relevant directories
   - Include only related patterns

2. Generate compact digest:

   **Structure Analysis (3-5 lines max):**
   ```
   - Entry: src/index.ts → app.ts → routes/
   - Core: src/services/ (business logic)
   - Data: src/models/ + prisma/schema.prisma
   ```

   **Key Patterns (bullet points):**
   ```
   - Error handling: Result<T, E> pattern
   - API responses: standardized via utils/response.ts
   - Auth: JWT in headers, middleware validates
   ```

   **Recent Changes (from git):**
   ```
   Last 5 commits:
   - feat: add user preferences
   - fix: auth token refresh
   - refactor: extract payment service
   ```

   **Active Files (most recently modified):**
   ```
   Hot files (last 24h):
   - src/services/payment.ts
   - src/routes/api/checkout.ts
   - tests/payment.test.ts
   ```

3. Output format:
   ```markdown
   ## Codebase Digest

   **Generated:** {timestamp}
   **Focus:** {area or "Full codebase"}
   **Size:** ~{estimated tokens} tokens

   ---

   ### Structure

   {3-5 line overview}

   ### Key Patterns

   {5-8 bullet points}

   ### Recent Activity

   {Last 5 commits}

   ### Hot Files

   {Most active files}

   ---

   *Compact digest for quick context. Run /gywd:map-codebase for full documentation.*
   ```

4. Save to `.planning/DIGEST.md` (overwrites previous)

5. Compare context size:
   ```
   Context comparison:
   - Full codebase map: ~15,000 tokens
   - This digest: ~800 tokens
   - Savings: 94%
   ```
</process>

<focus_areas>
Common focus areas and what they include:

| Focus | Directories | Patterns |
|-------|-------------|----------|
| auth | src/auth/, middleware/ | JWT, sessions, permissions |
| api | src/routes/, src/controllers/ | Endpoints, validation |
| data | src/models/, prisma/ | Schema, queries |
| frontend | src/components/, src/pages/ | UI patterns, state |
| testing | tests/, __tests__/ | Test patterns, mocks |
</focus_areas>

<output_format>
Compact markdown optimized for:
- Quick scanning (headers + bullets)
- Minimal token usage
- Essential information only
- Easy refresh (just re-run command)

Target size: 500-1000 tokens (vs 10,000+ for full map)
</output_format>

<success_criteria>
- [ ] Generates in under 10 seconds
- [ ] Output under 1000 tokens
- [ ] Captures key patterns
- [ ] Shows recent activity
- [ ] Saves to DIGEST.md
- [ ] Shows context savings
</success_criteria>
