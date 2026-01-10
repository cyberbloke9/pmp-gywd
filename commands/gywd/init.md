---
name: GYWD:init
description: Quick project initialization with minimal questions
argument-hint: "[project-name] [optional: --type greenfield|brownfield]"
---

<objective>
Fast-track project initialization for users who know what they want.

Unlike /gywd:new-project which asks many questions, /gywd:init gets you started quickly with sensible defaults.
</objective>

<context>
This is the "I just want to start coding" option. Use when:
- You have a clear idea already
- You want to skip extensive questioning
- You'll fill in details as you go
</context>

<process>
1. Parse arguments:
   - `$ARGUMENTS` may contain: project name, --type flag
   - Default type: auto-detect (brownfield if code exists, greenfield if empty)

2. If brownfield detected and no codebase map exists:
   - Ask: "Existing code detected. Map codebase first? [Y/n]"
   - If yes: Run /gywd:map-codebase, then continue
   - If no: Continue without mapping

3. Create minimal PROJECT.md:
   ```markdown
   # PROJECT: {name}

   ## What This Is
   {One-line description from user or "To be defined"}

   ## Core Value
   To be defined during development.

   ## Requirements
   - [ ] To be captured as development progresses

   ## Constraints
   None defined yet.

   ---
   *Quick-initialized. Expand as needed.*
   ```

4. Create config.json with defaults:
   ```json
   {
     "mode": "interactive",
     "planning_depth": "standard"
   }
   ```

5. Initialize git if not already initialized

6. Commit initialization files

7. Output:
   ```
   ✓ Project initialized: {name}

   Next steps:
   - /gywd:create-roadmap - Plan your phases
   - Edit .planning/PROJECT.md - Add details anytime
   ```
</process>

<examples>
Quick init with name:
```
/gywd:init my-saas-app
```

Force greenfield (ignore existing code):
```
/gywd:init api-service --type greenfield
```

Force brownfield mapping:
```
/gywd:init legacy-app --type brownfield
```
</examples>

<success_criteria>
- [ ] PROJECT.md created with minimal content
- [ ] config.json created with defaults
- [ ] Git initialized (if needed)
- [ ] User knows next step
- [ ] Total time: under 30 seconds
</success_criteria>
