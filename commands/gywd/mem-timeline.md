---
name: GYWD:mem-timeline
description: View chronological timeline of claude-mem observations
argument-hint: "[--anchor ID] [--query QUERY] [--depth N] [--project NAME]"
allowed-tools:
  - Read
  - Bash
---

<objective>
Display a chronological timeline of observations and sessions from claude-mem.

This helps understand the sequence of work, trace how decisions evolved, and find context around specific events.
</objective>

<context>
The timeline shows:
- When observations occurred
- What tools were used
- Which projects were worked on
- Session boundaries

Useful for:
- Understanding work history
- Finding context around a specific event
- Tracing decision evolution
</context>

<process>
1. Parse arguments:
   - `--anchor ID`: Center timeline around this observation
   - `--query QUERY`: Filter timeline by search query
   - `--depth N`: Number of items before/after anchor (default: 5)
   - `--project NAME`: Filter by project

2. Fetch timeline:
   ```bash
   curl -s "http://127.0.0.1:37777/api/timeline?anchor={id}&query={query}&depth_before={n}&depth_after={n}&project={project}"
   ```

3. Display timeline:
   ```
   ## Timeline ({count} items)

   ### {date}

   🔵 #{id} - {title}
      {type} | {project}
      {time}

   📋 #{id} - Session Start
      {session_name}
      {time}

   💬 #{id} - {prompt_preview}
      prompt
      {time}

   ---

   ### {previous_date}
   ...
   ```

Type icons:
- 🔵 Observation (tool call)
- 📋 Session
- 💬 Prompt
- 📝 Summary
</process>

<examples>
View recent timeline:
```
/gywd:mem-timeline
```

Center on specific observation:
```
/gywd:mem-timeline --anchor 123 --depth 10
```

Filter by project:
```
/gywd:mem-timeline --project my-api
```

Search within timeline:
```
/gywd:mem-timeline --query "database migration"
```
</examples>

<success_criteria>
- [ ] Timeline displayed chronologically
- [ ] Grouped by date
- [ ] Type icons help visual scanning
- [ ] Anchor navigation works correctly
- [ ] Search filtering works
</success_criteria>
