# Challenge Report: Phase 56 Live Dashboard Interactive

**Date:** 2026-04-12
**Mode:** Standard (4 agents)
**Target:** Phase 56 code (commands route, dashboard UI, activity feed, WS/SSE bridges)
**Agents:** Critic, Devil's Advocate, Red Team, Chaos

## Executive Summary

- **Total unique issues:** 24
- **Critical:** 1
- **High:** 8
- **Medium:** 9
- **Low / Concerns:** 6

**Ship blocker verdict:** Current code is usable for single-user local dev, but **not safe for any multi-user or networked deployment** without fixes to auth, regex injection, path traversal, and concurrent writes.

---

## Consensus Issues (multiple agents flagged)

### 🔴 CRITICAL — Auth bypass via `GYWD_API_AUTH=disabled`
A single env var disables auth for all `/api/*` including destructive `/execute`. No warning, no localhost-only gate, no `NODE_ENV` check. Combined with wide-open `cors()`, this is a full backdoor if deployed with the flag set.
- **Flagged by:** Red Team, Critic
- **Fix:** Require `NODE_ENV=development` + localhost bind to allow the disabled mode; log a big warning on startup.

### 🟠 HIGH — Path traversal in `GET /api/v1/commands/:name`
`commands.ts:73-83` strips `gywd:` prefix, appends `.md`, joins to `commandsDir` — no `path.resolve().startsWith(commandsDir)` check. Attacker can read any `.md` on the filesystem (e.g., `MEMORY.md`, `STATE.md` from other projects).
- **Flagged by:** Critic, Red Team, Chaos
- **Fix:** Validate `resolvedPath.startsWith(path.resolve(commandsDir))` and reject names with `/`, `\`, `..`.

### 🟠 HIGH — Regex injection in `mark-phase`
`commands.ts:221` interpolates raw `phase` into `new RegExp(...)`. `phase=".*"` rewrites every row. `phase="a+)+$"` triggers ReDoS on large STATE.md → event-loop lockup.
- **Flagged by:** Red Team, Chaos
- **Fix:** Escape phase with a regex-escape helper before `new RegExp`; cap input length.

### 🟠 HIGH — No atomic writes / concurrent STATE.md corruption
`update-state` and `mark-phase` do `readFileSync` → modify → `writeFileSync` with no lock. Two simultaneous clicks interleave; a crash mid-write truncates the file permanently.
- **Flagged by:** Red Team, Chaos
- **Fix:** Write to `STATE.md.tmp`, then `fs.renameSync` (atomic on POSIX); add an in-process mutex.

### 🟠 HIGH — CSRF in dashboard `/api/commands` proxy
Dashboard proxy forwards bodies to gateway with API key injected server-side. No CSRF token, no Origin check, no SameSite enforcement. `evil.com` with an open dashboard tab can trigger state mutations.
- **Flagged by:** Red Team
- **Fix:** Validate `Origin`/`Referer` header on dashboard POST routes; add SameSite=Strict cookies if auth is added.

### 🟠 HIGH — SSE reconnect is broken
`ActivityFeed.tsx:108-115` sets `eventSourceRef.current = null` after 5s but **never creates a new EventSource**. After first network blip the feed is silently dead until page refresh.
- **Flagged by:** Critic (Concerns)
- **Fix:** Actually call a reconnect function, or delegate to a shared `useSSE`/store.

---

## Contested / Agents Disagree

### Browser connects to gateway directly vs proxies via dashboard
- **Devil's Advocate (70-75%):** Revisit — Next.js proxy is 50 lines of passthrough, pure CORS-workaround dead weight. Gateway could be the only API.
- **Critic / Red Team:** The proxy is the reason dashboard can inject API key and would be a CSRF-protection surface if hardened.
- **Verdict:** Keep proxy for now; revisit when auth lands.

### Dynamic commands in Quick Actions
- **Devil's Advocate (85%):** The 4-action hardcoding contradicts the "commands are data" ethos.
- **Critic:** Hardcoding limits what can be exploited via UI.
- **Verdict:** Add a whitelist with safe-flag in frontmatter; render dynamically from that.

---

## Other High-Impact Issues (single agent)

### 🟠 HIGH — Prototype pollution in POST /execute
`express.json()` does not set `protoAction: 'remove'`. Attacker sends `__proto__` in body, poisons `Object.prototype` globally. *(Red Team)*
- **Fix:** `app.use(express.json({ limit: '100kb', strict: true }))` + switch to `protoAction: 'remove'` once Express supports it, or validate body with Zod schema.

### 🟠 HIGH — SSRF via `GYWD_API_URL`
`dashboard/src/lib/config.ts` accepts any URL. If set to `http://169.254.169.254/` (AWS IMDS) or `http://localhost:6379/` (Redis), Next.js server forwards API-key header and returns response body to browser. *(Red Team)*
- **Fix:** Allowlist hosts (`localhost`, configured hostnames only); reject private IP ranges in prod.

### 🟠 HIGH — `require('../server')` circular dep silently drops broadcasts
`commands.ts:122-127` lazy-requires server for `wsManager` and swallows failures. Production race can leave it `null`; broadcasts silently dropped. *(Critic)*
- **Fix:** Inject `wsManager` via `app.locals.wsManager` when mounting.

---

## Medium Issues

- **🟡 Value replacement treats `$&`/`$1` as backrefs** — `commands.ts:200` uses `replace(pattern, str)` where string form interprets `$1`, etc. Use the callback form: `replace(pattern, () => replacement)`. *(Chaos)*
- **🟡 No length cap on value / status / phase / field** — 10MB write = OOM. *(Chaos, Critic)*
- **🟡 No rate limiting on /execute** — amplification vector with broadcast fan-out. *(Critic)*
- **🟡 Unbounded WS clients + execution log + event buffer** — resource exhaustion. *(Red Team, Critic)*
- **🟡 ExecutionLog keys cause React churn** — `${timestamp}-${i}` shifts as entries prepend. *(Critic)*
- **🟡 `EVENT_CONFIG[type]` lookup is prototype-pollution vulnerable** — use `Object.hasOwn`. *(Chaos)*
- **🟡 WS has no client-side heartbeat/ping timeout** — silent-dead connections show "Live". *(Chaos)*
- **🟡 Event burst (>100/s) triggers 1000 React re-renders** — no batching. *(Chaos)*
- **🟡 Reconnect delay resets on `onopen`** — flappy server keeps delay at 1s (thundering herd). *(Chaos)*

---

## Low / Concerns

- **🟢 CommandList receives dead `onExecute={() => {}}`** — misleading prop. *(Critic)*
- **🟢 fs.watch unreliable on Windows/macOS** — use `chokidar`. *(Critic)*
- **🟢 `heartbeat` in `EVENT_CONFIG` but never emitted by server** — toggle is dead. *(Critic)*
- **🟢 Execution log not persisted** — lost on refresh, 90% confidence worth adding localStorage. *(Devil's Advocate)*
- **🟢 EventSource per component** — will hit browser 6-per-domain cap. *(Devil's Advocate)*
- **🟢 Commands cache** — readdir+read on every request, O(N) disk I/O. *(Devil's Advocate)*

---

## Recommended Actions (priority order)

**Ship blockers before any public/networked deploy:**
1. Escape `phase` regex + cap input length (Critical, quick fix)
2. Add `path.resolve + startsWith` check to `GET /commands/:name` (High, 5 lines)
3. Replace `readFileSync → writeFileSync` with tmp+rename + in-process mutex (High)
4. Validate body with Zod schema on `/execute`; reject `__proto__` keys (High)
5. Gate `GYWD_API_AUTH=disabled` behind `NODE_ENV=development` (High)

**Should fix before Phase 57:**
6. Fix SSE reconnect — actually reconnect, not just null the ref (High)
7. Add Origin/Referer check to dashboard POST routes (High)
8. Inject `wsManager` via `app.locals` (eliminate circular require) (High)
9. Cap length of `value`/`status`/`phase`/`field`; use Zod (Medium)
10. Allowlist `GYWD_API_URL` hosts (High if deployed; Low if local-only)

**Nice to have:**
11. Dynamic Quick Actions with frontmatter safe-flag
12. Commands cache with mtime invalidation
13. Persist ExecutionLog to localStorage
14. Shared EventSource via store/context

---

## Resolution Paths

1. **Address ship blockers now** — I'd estimate 30-60min to knock out items 1-5
2. **Create a security hardening phase** (56.1 insert-phase) for items 6-10
3. **Dismiss** items that are intentional for local-dev-only posture (document reason)
4. **Run aggressive mode** for deeper analysis with Skeptic agent on "do we need this feature at all?"

---

*Generated by `/gywd:challenge` — 4 adversarial agents in parallel*
