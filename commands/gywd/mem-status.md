---
name: GYWD:mem-status
description: Show claude-mem integration status and statistics
argument-hint: ""
allowed-tools:
  - Read
  - Bash
---

<objective>
Display the status of the claude-mem integration, including connection state, sync statistics, and imported patterns.
</objective>

<context>
The claude-mem integration:
- Connects to claude-mem worker via SSE streaming
- Maps observations to GYWD patterns
- Syncs patterns to GlobalMemory for cross-session learning

This command shows whether everything is working correctly.
</context>

<process>
1. Check claude-mem worker health:
   ```bash
   curl -s http://127.0.0.1:37777/api/health
   ```

2. Get worker statistics:
   ```bash
   curl -s http://127.0.0.1:37777/api/stats
   ```

3. Display status:
   ```
   ## Claude-Mem Integration Status

   ### Connection
   - Status: 🟢 Connected / 🔴 Disconnected
   - Worker: http://127.0.0.1:37777
   - Connected since: {timestamp}

   ### Statistics
   | Metric | Value |
   |--------|-------|
   | Observations received | {n} |
   | Patterns imported | {n} |
   | Sync errors | {n} |
   | Last sync | {timestamp} |

   ### Queue Status
   - Pending: {n} items
   - Batch size: 100
   - Sync interval: 30s

   ### Patterns by Type
   | Type | Count |
   |------|-------|
   | tool:read | {n} |
   | tool:write | {n} |
   | tool:edit | {n} |
   | tool:bash | {n} |
   | tool:search | {n} |
   ```
</process>

<worker_not_running>
If the worker is not running, display:
```
## Claude-Mem Integration Status

❌ **Worker Not Running**

The claude-mem worker is not available at http://127.0.0.1:37777

### To Start the Worker

1. Navigate to claude-mem directory
2. Run: `npx claude-mem worker`

Or install globally:
```bash
npm install -g claude-mem
claude-mem worker
```

Once running, the integration will auto-connect via SSE streaming.
```
</worker_not_running>

<success_criteria>
- [ ] Connection status clearly shown
- [ ] Statistics displayed in readable format
- [ ] Clear instructions if worker not running
- [ ] Pattern counts by type shown
</success_criteria>
