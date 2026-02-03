---
name: GYWD:mem-sync
description: Manually sync claude-mem observations to GYWD patterns
argument-hint: "[--full] [--since DATE]"
allowed-tools:
  - Read
  - Bash
---

<objective>
Manually trigger synchronization of claude-mem observations into GYWD's pattern memory.

While real-time SSE streaming handles continuous sync, this command lets you:
- Force a full historical sync
- Sync observations since a specific date
- Verify sync is working correctly
</objective>

<context>
The integration normally auto-syncs via SSE streaming. Use manual sync when:
- Starting fresh and need historical data
- Troubleshooting sync issues
- After worker restart
- To import observations from a specific time period
</context>

<process>
1. Parse arguments:
   - `--full`: Sync all historical observations
   - `--since DATE`: Sync observations since date (YYYY-MM-DD)

2. Check worker availability:
   ```bash
   curl -s http://127.0.0.1:37777/api/health
   ```

3. Fetch observations:
   ```bash
   # Full sync
   curl -s "http://127.0.0.1:37777/api/observations?limit=1000"

   # Since date
   curl -s "http://127.0.0.1:37777/api/observations?since={date}&limit=1000"
   ```

4. Process and import:
   - Map each observation to GYWD pattern format
   - Import to GlobalMemory
   - Track statistics

5. Display results:
   ```
   ## Sync Complete

   | Metric | Count |
   |--------|-------|
   | Fetched | {n} |
   | Imported | {n} |
   | Merged (existing) | {n} |
   | Errors | {n} |
   | Duration | {ms}ms |

   ### By Type
   | Type | Imported |
   |------|----------|
   | tool:read | {n} |
   | tool:write | {n} |
   | tool:bash | {n} |

   ✓ Patterns now available in GYWD memory
   ```
</process>

<examples>
Sync all historical observations:
```
/gywd:mem-sync --full
```

Sync last week's observations:
```
/gywd:mem-sync --since 2024-01-15
```

Quick incremental sync:
```
/gywd:mem-sync
```
</examples>

<success_criteria>
- [ ] Observations fetched from claude-mem
- [ ] Patterns correctly mapped and imported
- [ ] Statistics displayed
- [ ] No duplicate patterns created
- [ ] Errors clearly reported
</success_criteria>
