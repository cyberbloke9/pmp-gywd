# Migration Guide: v4.x to v5.0

## Overview

PMP-GYWD v5.0 "Connected Intelligence" adds 10 new phases (43-52) on top of v4.1. There are **no breaking changes** to existing commands or APIs. All v4.x projects work with v5.0 without modification.

## What's New in v5.0

### Web Dashboard (`dashboard/`)
- Next.js 14 + TypeScript + Tailwind planning dashboard
- Real-time SSE updates with file watching
- Timeline, heatmap, decision graph, and expertise radar charts
- API routes: `/api/status`, `/api/memory`, `/api/patterns`, `/api/planning`, `/api/stream`

### API Gateway (`api-gateway/`)
- Express server on port 3945 with WebSocket support
- API key authentication (X-API-Key header)
- Rate limiting (100 req/min per key)
- OpenAPI 3.0.3 spec at `/api/v1/docs`

### Semantic Memory (`lib/semantic/`)
- Zero-dependency TF-IDF embeddings with cosine similarity
- `Embedder` — tokenize, fit, embed, export/import vocabulary
- `SemanticSearch` — index building, filtered search, similarity queries
- `ContextInjector` — auto-surfaces relevant patterns for tasks
- `DecisionSimilarity` — find similar past decisions, detect conflicts

### Multi-Model Support (`lib/models/`)
- Provider-agnostic LLM adapter system
- `OpenAIAdapter` — GPT-4o, o1, o3 with reasoning model format
- `GoogleAdapter` — Gemini 2.0 Flash/Pro with systemInstruction format
- `LocalAdapter` — Ollama + llama.cpp backends (free, private)
- `ModelRouter` — 4 selection strategies (cheapest/fastest/best/balanced), fallback chains

### CRDT Collaboration (`lib/crdt/`)
- Conflict-free replicated data types for multi-user editing
- Primitives: GCounter, PNCounter, LWWRegister, ORSet (add-wins)
- `PlanEditor` — multi-user plan editing with presence tracking
- `DecisionVoting` — team consensus with majority/unanimous/plurality
- `ConflictResolver` — three-way diff with 7 merge strategies

### Enterprise Features (`lib/enterprise/`)
- `SSOManager` — OIDC JWT validation + SAML assertion parsing
- `RBAC` — 3 built-in roles (admin/developer/viewer), custom roles, enforce()
- `AuditLog` — append-only with SHA-256 hash chain integrity
- `ComplianceReporter` — SOC2 (8 checks) + GDPR (7 checks)

### CI/CD Integration (`lib/ci/`)
- `PreMergeValidator` — 6 automated GYWD checks for PRs
- `ReleaseNotesGenerator` — auto-generate notes from GYWD data
- `CIRunner` — CLI entry point for CI pipelines
- GitHub Actions workflow (`.github/workflows/gywd-checks.yml`)
- GitLab CI template (`ci-templates/gitlab-ci.yml`)

## Upgrade Steps

### 1. Update the package

```bash
npm install pmp-gywd@5.0.0
```

### 2. (Optional) Enable the web dashboard

```bash
cd dashboard
npm install
npm run dev
# Open http://localhost:3000
```

### 3. (Optional) Start the API gateway

```bash
cd api-gateway
npm install
npm start
# API at http://localhost:3945
```

### 4. (Optional) Add GYWD CI checks

Copy the workflow to your project:

```bash
# GitHub Actions
cp node_modules/pmp-gywd/.github/workflows/gywd-checks.yml .github/workflows/

# GitLab CI — include in your .gitlab-ci.yml:
# include:
#   - local: 'node_modules/pmp-gywd/ci-templates/gitlab-ci.yml'
```

### 5. (Optional) Run pre-merge validation locally

```bash
node node_modules/pmp-gywd/lib/ci/ci-runner.js validate
node node_modules/pmp-gywd/lib/ci/ci-runner.js release-notes --version 5.0.0
```

## Compatibility

| Feature | Requires |
|---------|----------|
| Core lib modules | Node.js >= 16.7.0 |
| Web Dashboard | Node.js >= 18 (Next.js 14) |
| API Gateway | Node.js >= 16.7.0 |
| All 47 commands | No changes from v4.x |

## Zero Breaking Changes

- All existing commands work identically
- All v4.x `.planning/` files are compatible
- No configuration changes required
- No dependency changes (still zero runtime deps for core)
- Claude-mem integration unchanged

## New Dependencies

**Core:** None (still zero runtime deps)

**Dashboard (optional):** Next.js 14, React 18, Tailwind CSS, Recharts

**API Gateway (optional):** Express, ws, zod

**Dev:** No new dev dependencies
