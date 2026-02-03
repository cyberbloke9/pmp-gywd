---
name: GYWD:mem-search
description: Search claude-mem observations across sessions
argument-hint: "<query> [--type TYPE] [--limit N] [--project NAME]"
allowed-tools:
  - Read
  - Bash
---

<objective>
Search through claude-mem persistent memory to find relevant observations, prompts, and context from previous sessions.

This enables cross-session learning by surfacing what Claude learned in the past.
</objective>

<context>
Claude-mem captures:
- **Observations**: Tool calls and their context (Read, Write, Edit, Bash, etc.)
- **Prompts**: User prompts and queries
- **Sessions**: Complete conversation sessions
- **Summaries**: Compressed session summaries

This command searches across all captured data using semantic search.
</context>

<process>
1. Parse arguments:
   - `query`: The search term (required)
   - `--type`: Filter by type (observation, prompt, session, summary)
   - `--limit`: Max results (default: 20)
   - `--project`: Filter by project name

2. Check claude-mem worker status:
   ```bash
   curl -s http://127.0.0.1:37777/api/health
   ```
   - If not running, inform user to start worker

3. Execute search:
   ```bash
   curl -s "http://127.0.0.1:37777/api/search?query={query}&type={type}&limit={limit}&project={project}"
   ```

4. Format and display results:
   ```
   ## Search Results ({count} found)

   Query: "{query}"

   ### #{id} - {title}
   - Type: {type}
   - Project: {project}
   - Date: {created_at}

   {subtitle or summary}

   ---
   ```
</process>

<examples>
Search for authentication-related work:
```
/gywd:mem-search authentication patterns
```

Search only observations:
```
/gywd:mem-search "error handling" --type observation
```

Search in specific project:
```
/gywd:mem-search database --project my-api --limit 10
```
</examples>

<success_criteria>
- [ ] Search results displayed clearly
- [ ] Results grouped by relevance
- [ ] User can identify useful past context
- [ ] Error shown if worker not running
</success_criteria>
