# Whole-Repo Security Audit

**Date:** 2026-04-12
**Target:** Entire PMP-GYWD repo (not just Phase 56)
**Agents:** penetration-tester · security-auditor · dependency-manager · secrets-hunter · identity-access-specialist

## TL;DR

**The enterprise module (`lib/enterprise/`) is security theater.** Four separate agents independently identified the same catastrophic flaws: SSO doesn't verify tokens, RBAC doesn't gate its own role assignment, audit log can be tampered, compliance checks test "is object not null." Shipping this as "enterprise-grade" is dangerous — users will trust it.

---

## Consensus Critical Findings (flagged by 3+ agents independently)

### 🔴 C1 — SSO accepts forged tokens
**File:** `lib/enterprise/sso.js:83-133, 144-188`
**CWE:** CWE-347 (Improper Signature Verification)
**Flagged by:** pentester, security-auditor, identity-specialist

- `validateOIDCToken()` parses JWT payload without verifying the signature. `alg=none` is accepted, `alg=HS256`-vs-`RS256` confusion works, `kid` is ignored. **Any forged JWT returns `valid: true`.**
- `validateSAMLAssertion()` base64-decodes, checks `xml.includes('<saml')`, then extracts claims via regex. No signature verification, no canonicalization, no cert pinning. Trivial XML Signature Wrapping (XSW).

**Attack:** Forge a JWT with `{"alg":"none"}` header and `{"roles":["admin"]}` payload — `createSession()` accepts it.

**Fix:** `jose.jwtVerify()` with JWKS + pinned algorithm. `@node-saml/node-saml` or `xml-crypto` + `xmldom` for SAML signature verification, AudienceRestriction, NotBefore/NotOnOrAfter, InResponseTo, replay protection.

---

### 🔴 C2 — RBAC has no meta-permission on role assignment
**File:** `lib/enterprise/rbac.js:148-162, 69-76`
**CWE:** CWE-269 (Improper Privilege Management)
**Flagged by:** pentester, identity-specialist

`assignRole(userId, roleId)`, `createRole(...)`, `deleteRole(...)`, `addPermissionToRole(...)` have **no caller-identity check**. The `manage_roles` permission is defined but never consulted. Any code path with access to the RBAC instance can self-grant admin. Custom roles accept arbitrary permission strings (`['*', 'manage_users', ...]`) — no validation.

**Fix:** All mutation APIs take `callerUserId`, internally call `enforce(callerUserId, 'manage_roles')`. Permission registry with wildcard blocklist.

---

### 🔴 C3 — Audit log hash chain is tamper-weak
**File:** `lib/enterprise/audit-log.js:54, 62-64, 22`
**CWE:** CWE-353, CWE-778
**Flagged by:** pentester, security-auditor, identity-specialist

Three independent failures:
- **Chain covers only 5 fields** (`id, timestamp, userId, action, prevHash`) — `resource`, `resourceId`, `outcome`, `metadata`, `ip` can be mutated without breaking integrity.
- **FIFO `shift()` breaks the chain** after `maxEntries`. `verifyIntegrity()` starts from `prevHash='0'`, but the entry that anchored to `'0'` is gone. Either verification falsely fails on honest logs, or an attacker rewrites entry[0] to re-anchor.
- **In-memory only.** Process crash = total log loss. Yet `_checkAuditRetention` claims compliance.
- **No HMAC.** Unkeyed SHA-256 means any attacker with code access can forward-recompute after tampering.
- **No authentication on `log()`.** Any caller can synthesize entries with any `userId`.

**Fix:** HMAC-SHA256 with server secret. Canonical JSON of full entry in hash input. Persist JSONL with `O_APPEND` + fsync. Archive with carry-hash rollover (no `shift()`). Sign `log()` calls with caller-bound key.

---

### 🔴 C4 — API keys stored plaintext, mintable by any key
**File:** `api-gateway/src/lib/api-keys.ts:37, 55-64, 17-22` + `routes/keys.ts:22-37`
**CWE:** CWE-256, CWE-208, CWE-285, CWE-862
**Flagged by:** pentester, security-auditor, identity-specialist

- **Plaintext storage** in `~/.gywd/api-keys.json`. Any process, backup, cloud-sync, or curious admin that reads the file owns every key.
- **Default file mode** (0644 on Linux; full ACL on Windows). Should be 0600.
- **`===` string compare** is not constant-time → timing attack possible.
- **Any valid key can mint new keys** via `POST /api/v1/keys` (no role gate). Plus `DELETE /api/v1/keys` accepts the target key in body — a leaked viewer key can revoke the superuser.
- **Read-modify-write on every request** (`validateKey` writes `requestCount` + `lastUsed` back to disk). Concurrent requests race; file corrupts under load.

**Fix:** Store `sha256(key)` or `argon2id(key)`. `crypto.timingSafeEqual` for compare. File mode 0600. Require `manage_keys` permission (gated by RBAC). DELETE by key-id, not by key material. Async-flush usage counters.

---

### 🔴 C5 — Plugin loader has no sandbox
**File:** `lib/plugins/plugin-loader.js:160-193, 127`
**CWE:** CWE-693, CWE-94
**Flagged by:** pentester, security-auditor

`_loadSandboxed()` defines a local `_sandboxedRequire` and never uses it — the final line `return require(entryPath)` is real Node `require`. The `sandbox: true` option is a lie; the inline comment confirms it was never implemented. `_readManifest` accepts `main: "../../../.." ` (attacker-controlled via plugin.json).

**Attack:** Drop a plugin dir with `index.js` that runs `require('child_process').execSync('...')` — anyone who can place files in the plugin dir gets RCE.

**Fix:** `vm.createContext()` + worker_threads with message-passing. Or drop the sandbox pretense and document that plugins = arbitrary code (same trust as `node_modules`). Validate manifest `main` stays within plugin dir.

---

## The Attack Chain (synthesized by pentester)

**Viewer API key → full compromise in 7 steps:**

1. Attacker obtains a read-only API key (phishing, CI log leak, or reads plaintext `~/.gywd/api-keys.json`).
2. `POST /api/v1/keys` with that viewer key → gets equivalent new key (C4).
3. On any SSO-enabled deploy, forge JWT with `alg:none` claiming `roles:['admin']` → `createSession()` persists admin session (C1).
4. Dashboard calls `rbac.hasPermission('attacker', 'manage_plugins')` → true (C2).
5. Upload malicious plugin → RCE on gateway host (C5).
6. RCE reads `~/.gywd/api-keys.json` → all tenants' plaintext keys (C4).
7. Mutate audit log `metadata`, `ip`, `outcome` on own entries; `verifyIntegrity()` still reports "valid" (C3).

**Forensic trail is poisoned before it's written.**

---

## High-Severity (single-agent findings)

### H1 — `GET /api/v1/keys` leaks key prefix + usage pattern (`api-keys.ts:77-82`)
First 12 chars of the key returned (`gywd_` + 7 hex). Plus `requestCount` and `lastUsed` — per-key usage fingerprinting.
**Fix:** Return opaque `id` only. Hide counters behind admin role.

### H2 — Cloud sync prototype pollution (`lib/multi-agent/cloud-sync.js:271-291`)
`_mergeData(local, remote)` recursively merges without stripping `__proto__`/`constructor`/`prototype`. Currently `_fetchRemote` is stubbed — but Phase 49 (deferred) will wire this to HTTP. Ship the fix now.
**Fix:** `Object.create(null)` for merged; explicitly skip dangerous keys; schema-validate before merge.

### H3 — `TeamSync.importFromTeam` accepts unsigned patterns (`lib/memory/team-sync.js:165`)
A tampered `patterns.json` poisons every downstream project via global memory.
**Fix:** HMAC-sign team exports; verify on import; refuse unsigned.

### H4 — `hook-manager.js:104` — plugin-registered regex (ReDoS)
`new RegExp(hook.pattern)` where `hook.pattern` is supplied by plugins. Malicious plugin = event-loop lockup.
**Fix:** Regex linter (`safe-regex`), timeout on match, cap pattern length.

### H5 — CORS `*` with `X-API-Key` header auth (`api-gateway/src/app.ts:17`)
`cors()` with no options reflects any Origin. Browser tabs with keys in localStorage + malicious site = exfil via fetch.
**Fix:** `cors({ origin: allowlist, credentials: true })`. Move key to HttpOnly cookie or OAuth bearer.

### H6 — Compliance checker is theater (`lib/enterprise/compliance.js`)
Multiple checks evaluate "is object non-null" rather than behavior:
- `_checkRBACEnabled` — passes if `new RBAC()` was called. Doesn't test enforcement.
- `_checkSSOEnabled` — passes if a provider is registered. Doesn't test validation.
- `_checkErasureSupported` — hardcoded `pass: true`. GDPR right-to-erasure is **not implemented**; the "evidence" cited is `auditLog.clear()` — which wipes *all* logs, not per-user data. This is the opposite of compliance.
- `_checkDataMinimization` — passes because an audit log exists. Audit log is the opposite of minimization.
- `_checkFailedAccessLogged` — passes on empty log (`size === 0`).

Claiming SOC2/GDPR compliance with this checker is materially misleading.

**Fix:** Replace with behavioral probes — attempt a denied request and verify it was denied; attempt a tampered token and verify it was rejected; verify per-user erasure actually purges. Or remove compliance claims entirely.

---

## Dependency / Supply Chain

- **Node 16 is EOL (Sep 2023)**. `engines` says `>=16.7.0`. Upgrade to `>=20.0.0`.
- **Root `package-lock.json` version 3.0.0 doesn't match `package.json` 5.0.0.** `npm ci` may install wrong transitive versions. Regenerate.
- **1 critical + 11 high npm advisories** via transitive dev deps:
  - `handlebars` via `jest-junit` — JS injection (critical + 2 high)
  - `next@14.2.0` — 5 high CVEs fixed in 16.2.4
  - `minimatch`, `picomatch`, `ajv`, `brace-expansion`, `flatted`, `path-to-regexp`, `qs`
- Run `npm audit fix` in all three workspaces; upgrade `next` major with migration.

---

## Secrets Hunt (CLEAN ✅)

The one agent with a clean bill of health:
- **No live credentials** in working tree or git history
- `dashboard/.env.local.example` placeholder is empty
- `Math.random()` used 17 times but all for non-security IDs (agent IDs, team IDs, request IDs) — acceptable
- No `md5`/`sha1` hashing anywhere
- No secrets in logs

**But `.gitignore` needs expansion:**
- `.env`, `.env.local`, `.env.*.local`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- `credentials.json`, `.npmrc`
- `.claude.json`, `.claude.json.backup`

---

## Ship-Blocker Priority (order to fix)

**Before any public release with the "enterprise" label:**

1. **C1** — SSO JWT/SAML signature verification (replace with `jose` + `@node-saml/node-saml`)
2. **C4** — API key plaintext + permissions (hash at rest, file mode 0600, `timingSafeEqual`, RBAC gate on `/keys`)
3. **C2** — RBAC self-gating (`assignRole` requires `manage_roles`)
4. **C3** — Audit log (HMAC chain over full fields, JSONL persistence, no FIFO, auth on `log()`)
5. **C5** — Plugin sandbox (real VM or documented no-sandbox)
6. **H6** — Compliance checker honesty (remove false claims OR implement real checks)

**Before any production deploy:**

7. **H5** — Lock CORS
8. **H2** — Cloud sync prototype pollution (proactive)
9. **H4** — Plugin regex ReDoS
10. **Deps** — `npm audit fix` + Node 20 + lockfile regeneration

**Best practices:**

11. **H1** — Key prefix leak
12. **H3** — TeamSync signing
13. Expand `.gitignore`

---

## Architectural Recommendations

### 1. Unify auth + authz + audit into a single middleware pipeline

Today `lib/enterprise/` is a *suggestion* and `api-gateway/` is a separate reality. They don't talk to each other. Wire:

```
authMiddleware → resolve authContext {userId, roles, sessionId}
             → requirePermission(p) middleware calls rbac.enforce()
             → post-response: auditLog.log({...ctx, outcome})
```

Right now RBAC, SSO, and AuditLog exist but **nothing in the runtime path uses them**. This is why every critical finding above is possible.

### 2. Replace DIY JWT/SAML with vetted libraries

The home-grown parsers look like validation but validate nothing cryptographic. They are negative-value code — worse than having no SSO at all, because users will *trust* them. Delete and use `jose` + `@node-saml/node-saml`.

### 3. Make compliance a behavioral probe, not a presence check

Compliance checker should send a forged JWT to SSO and assert rejection. Attempt a tampered audit entry and assert detection. Attempt a role assignment without `manage_roles` and assert denial. Any check that passes on "object is non-null" is theater.

### 4. Document what ISN'T enterprise

If sandboxing, signing, and durable audit are out of scope for now, **say so loudly** in the README and package description. Current framing ("Enterprise Features: SOC2/GDPR compliance") is materially misleading.

---

*Generated by 5 specialized security agents in parallel: penetration-tester, security-auditor, dependency-manager, secrets-hunter, identity-access-specialist.*
