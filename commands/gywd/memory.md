---
name: GYWD:memory
description: Multi-session memory - persist learned patterns and preferences
argument-hint: "[show|add|clear] [optional: pattern or preference]"
---

<objective>
Manage persistent memory across sessions. GYWD learns your patterns, preferences, and project-specific rules that carry forward between sessions.

Memory types:
- **Preferences**: Coding style, library choices, naming conventions
- **Patterns**: Repeated solutions, common fixes, architectural decisions
- **Rules**: Project-specific constraints ("always use TypeScript", "never modify legacy/")

This allows Claude to remember what worked well and avoid repeating mistakes.
</objective>

<context>
Arguments: $ARGUMENTS

**Subcommands:**
- `show` - Display all stored memories (default)
- `add <type> <content>` - Add a new memory
- `clear [type]` - Clear memories (all or by type)
- `learn` - Auto-extract patterns from recent work

**Memory storage:** `.planning/MEMORY.md`
</context>

<process>
## show (default)

1. Read `.planning/MEMORY.md` if exists
2. Display formatted memory:
   ```
   ## Project Memory

   ### Preferences
   - Use TypeScript with strict mode
   - Prefer functional components over class components
   - Always include JSDoc comments for public APIs

   ### Patterns
   - Error handling: Use Result<T, E> pattern from utils/result.ts
   - API calls: Always wrap in try-catch with retry logic
   - Tests: One test file per module, co-located

   ### Rules
   - Never modify files in legacy/ directory
   - All new files must have corresponding .test.ts
   - Commits must pass CI before merge

   ---
   *3 preferences, 3 patterns, 3 rules stored*
   ```

## add <type> <content>

1. Parse type: preference|pattern|rule
2. Parse content (rest of arguments)
3. Add to appropriate section in MEMORY.md
4. Confirm: "Added {type}: {content}"

Examples:
- `/gywd:memory add preference Use pnpm instead of npm`
- `/gywd:memory add pattern Always create index.ts barrel files`
- `/gywd:memory add rule Never use console.log in production code`

## clear [type]

1. If type specified: Clear only that section
2. If no type: Confirm, then clear all
3. Output: "Cleared {count} {type} memories"

## learn

1. Read recent SUMMARY.md files (last 3-5)
2. Analyze for:
   - Repeated decisions
   - Consistent patterns
   - Explicit rules mentioned
3. Suggest memories to add:
   ```
   ## Learned Patterns

   Based on recent work, I noticed:

   1. **Pattern detected**: You consistently use early returns
      Add as pattern? [Y/n]

   2. **Preference detected**: All components use React.FC type
      Add as preference? [Y/n]

   3. **Rule detected**: Tests always include edge cases
      Add as rule? [Y/n]
   ```
4. Add confirmed patterns to MEMORY.md

</process>

<memory_format>
MEMORY.md structure:
```markdown
# Project Memory

Last updated: {date}

## Preferences

Style and tooling choices that should be consistent.

- {preference 1}
- {preference 2}

## Patterns

Repeated solutions and approaches.

- {pattern 1}
- {pattern 2}

## Rules

Hard constraints that must be followed.

- {rule 1}
- {rule 2}

---
*Auto-loaded at session start via STATE.md*
```
</memory_format>

<integration>
**How memories are used:**

1. At session start (/gywd:resume-work):
   - Load MEMORY.md
   - Apply as context for all planning/execution

2. During planning (/gywd:plan-phase):
   - Check patterns for relevant solutions
   - Apply preferences to design decisions
   - Enforce rules as constraints

3. During execution:
   - Validate work against rules
   - Apply patterns automatically
   - Follow preferences consistently
</integration>

<success_criteria>
- [ ] show displays all memories organized by type
- [ ] add correctly appends to appropriate section
- [ ] clear removes specified or all memories
- [ ] learn extracts patterns from summaries
- [ ] Memories persist across sessions
- [ ] Format is readable and maintainable
</success_criteria>
