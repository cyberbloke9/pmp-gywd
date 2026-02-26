# Changelog

All notable changes to PMP-GYWD will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2026-02-26

### Added

#### Web Dashboard (Phases 43-44)
- **Planning Dashboard** (`dashboard/`) — Next.js 14 + TypeScript + Tailwind web UI
- **Bridge Layer** (`gywd-bridge.ts`) — reads GYWD JSON/Markdown files directly (no CJS imports)
- **Components** — Sidebar, Header, StatusCards, ProgressSection, PhaseTimeline, MemorySummary, Skeleton loaders
- **Charts** — TimelineChart, PatternHeatmap, DecisionGraph, ExpertiseRadar, MilestoneProgress, PatternDistribution
- **API Routes** — `/api/status`, `/api/memory`, `/api/patterns`, `/api/planning`, `/api/stream` (SSE), `/api/charts`
- **SSE Manager** — real-time updates with `fs.watch()` and `useSSE` React hook
- **95 dashboard tests** across 9 suites

#### API Gateway (Phase 45)
- **Express Server** (`api-gateway/`) — REST API on port 3945 with WebSocket support
- **Routes** — `/api/v1/status`, `/api/v1/memory`, `/api/v1/patterns`, `/api/v1/planning`, `/api/v1/keys`
- **Authentication** — API key middleware (X-API-Key header), generate/revoke/list keys
- **Rate Limiting** — 100 req/min per key with X-RateLimit headers
- **Validation** — Zod schemas for query params and request bodies
- **OpenAPI** — 3.0.3 spec at `/api/v1/docs`
- **45 API gateway tests** across 7 suites

#### Semantic Memory (Phase 46)
- **Embedder** (`lib/semantic/embedder.js`) — zero-dependency TF-IDF tokenizer, term frequency, cosine similarity
- **SemanticSearch** (`lib/semantic/search.js`) — index building, filtered search, findSimilar, export/import
- **ContextInjector** (`lib/semantic/context-injector.js`) — auto-loads patterns/expertise/projects, surfaces relevant context
- **DecisionSimilarity** (`lib/semantic/decision-similarity.js`) — find similar past decisions, detect conflicts

#### Multi-Model Support (Phase 47)
- **BaseAdapter** (`lib/models/base-adapter.js`) — abstract LLM interface, MODEL_PRICING (16 models), MODEL_CAPABILITIES
- **OpenAIAdapter** — GPT-4o, GPT-4o-mini, o1, o3, o3-mini with reasoning model 'developer' role mapping
- **GoogleAdapter** — Gemini 2.0 Flash/Pro with systemInstruction + contents format
- **LocalAdapter** — Ollama (chat API) + llama.cpp (completion API) backends
- **ModelRouter** — 4 strategies (cheapest/fastest/best/balanced), task-type routing, fallback chains, usage stats

#### CRDT Collaboration (Phase 48)
- **GCounter** (`lib/crdt/base-crdt.js`) — grow-only counter
- **PNCounter** — increment/decrement counter
- **LWWRegister** — last-writer-wins register
- **ORSet** — observed-remove set with add-wins semantics
- **PlanEditor** (`lib/crdt/plan-editor.js`) — multi-user plan editing with LWW fields, OR-Set tasks, presence tracking
- **DecisionVoting** (`lib/crdt/decision-voting.js`) — team consensus with majority/unanimous/plurality strategies
- **ConflictResolver** (`lib/crdt/conflict-resolver.js`) — three-way diff with 7 merge strategies

#### Enterprise Features (Phase 50)
- **SSOManager** (`lib/enterprise/sso.js`) — OIDC JWT validation + SAML assertion parsing, provider registry, session management
- **RBAC** (`lib/enterprise/rbac.js`) — 3 built-in roles (admin/developer/viewer), custom roles, enforce(), permission union
- **AuditLog** (`lib/enterprise/audit-log.js`) — append-only with SHA-256 hash chain, query/filter, integrity verification
- **ComplianceReporter** (`lib/enterprise/compliance.js`) — SOC2 (8 checks) + GDPR (7 checks) + custom check registration

#### CI/CD Integration (Phase 51)
- **PreMergeValidator** (`lib/ci/pre-merge-validator.js`) — 6 checks: drift, decisions, test-health, patterns, phase-alignment, state-integrity
- **ReleaseNotesGenerator** (`lib/ci/release-notes.js`) — auto-generate notes from GYWD phases/decisions/patterns/stats
- **CIRunner** (`lib/ci/ci-runner.js`) — CLI entry point: validate, release-notes, report commands
- **GitHub Actions** (`.github/workflows/gywd-checks.yml`) — PR validation with comments, artifact uploads, release notes
- **GitLab CI** (`ci-templates/gitlab-ci.yml`) — validate/drift/decisions/test-health/release-notes jobs

### Changed
- Test count: 618 → 1,299 (1,159 core + 95 dashboard + 45 api-gateway)
- Lib modules: 20+ → 49 (25 original + 4 semantic + 6 models + 5 crdt + 5 enterprise + 4 ci)
- Commands: 43 → 47 (added mem-search, mem-sync, mem-status, mem-timeline)
- Added `ci-templates` to npm package files
- Added new keywords: semantic-memory, crdt, multi-model, ci-cd

### Deferred
- **Phase 49: Cloud Sync Service** — deferred (no S3/R2 storage backend available)

---

## [4.0.0] - 2026-02-01

### Added

#### Agent Runtime (Phase 29)
- **BaseAgent** (`lib/agents/base-agent.js`) - Lifecycle management (spawn/execute/collect)
- **CriticAgent** - Code quality review with pattern analysis
- **DevilsAdvocateAgent** - Challenges assumptions and finds counterarguments
- **RedTeamAgent** - Security vulnerability scanning
- **ChaosAgent** - Edge case and failure mode testing
- **SkepticAgent** - Questions requirements and decisions
- **AgentOrchestrator** - Sequential/parallel/priority/pipeline execution strategies

#### Permission Scanner (Phase 30)
- **OperationClassifier** (`lib/permissions/`) - Pattern-based classification (safe/dangerous/unknown)
- **RiskScorer** - Multi-factor risk scoring (category, target, context, history, time)
- **PermissionRouter** - Auto-approve safe operations, route dangerous to user

#### Analytics Agents (Phase 31)
- **ModelGeneratorAgent** (`lib/analytics/`) - Schema-to-code generation (JS/TS/SQL)
- **TestGeneratorAgent** - Model-to-test generation (Jest/Mocha)
- **ReviewAgent** - Code review with pattern-based analysis and quality scoring

#### Self-Grilling (Phase 32)
- **PlanChallengerAgent** (`lib/grilling/`) - Questions assumptions before execution
- **ChangeValidatorAgent** - Validates proposed changes with risk assessment
- **DecisionGrillerAgent** - "5 Whys" analysis and cognitive bias detection

#### Multi-Agent Coordination (Phases 33-34)
- **MultiAgentCoordinator** (`lib/multi-agent/`) - Shared state with conflict resolution
- **MessageQueue** - Inter-agent messaging with pub/sub and priority queues

#### Cloud & Team Sync (Phases 35-36)
- **CloudSyncManager** - Remote state storage with versioned sync
- **TeamSyncManager** - Real-time team pattern sharing and decision voting

#### Plugin System (Phases 37-38)
- **PluginLoader** (`lib/plugins/`) - Load, enable, disable plugins with sandboxing
- **PluginMarketplace** - Search, browse, install plugins from registry

#### Visual Dashboard (Phase 39)
- **DashboardRenderer** (`lib/dashboard/`) - ASCII dashboard with charts and metrics
- Status cards, progress bars, sparkline trends, activity feeds

### Changed
- Major version bump to 4.0.0 (Autonomous Intelligence)
- 12 new lib modules totaling 8,000+ lines of code
- Enhanced architecture for multi-agent autonomous operations

---

## [3.4.0] - 2026-02-01

### Added

#### Performance Optimization (Phase 19)
- **MetadataCache** (`lib/cache/metadata-cache.js`) - mtime-based file metadata caching with LRU eviction
- **KeywordIndex** (`lib/index/keyword-index.js`) - O(1) keyword lookups via inverted index
- **Context graph persistence** - saveGraph/loadGraph methods in ContextAnalyzer
- **MetricsDashboard** (`lib/metrics/dashboard.js`) - render(), renderCompact(), renderJSON() methods
- **Profile optimization** - getCompactProfile(), getProfileSize(), exportWithLimit() methods
- 44 new performance tests

#### New Commands (Phase 20)
- `/gywd:undo` - Granular undo with --last, --commit, --file, --preview options
- `/gywd:compare` - Compare versions/branches/phases with summary/detailed/diff modes
- `/gywd:snapshot` - Create/list/restore/delete named checkpoints

#### IDE Integration (Phase 21)
- **VS Code Extension** (`vscode-extension/`)
  - Status bar integration showing current phase and focus
  - 6 commands: progress, status, planPhase, executePhase, verifyWork, createPhase
  - File watcher for .planning directory changes
  - Activation on .planning folder presence

#### MCP Server (Phase 22)
- **MCP Server** (`mcp-server/`)
  - 4 tools: get_status, get_roadmap, get_context, search_files
  - Resource exposure: state, roadmap, issues
  - Stdio transport for Claude Desktop integration

#### Developer Experience (Phases 23-27)
- **ErrorFormatter** (`lib/errors/error-formatter.js`) - Patterns, suggestions, recovery hints
- **ProgressIndicator** (`lib/cli/progress-indicator.js`) - Spinners and progress bars
- **TaskRunner** (`lib/cli/progress-indicator.js`) - Sequential task execution with visual feedback
- **HookManager** (`lib/hooks/hook-manager.js`) - Pre/post command, task, and commit hooks
- **ClaudeMdGenerator** (`lib/sync/claude-md-generator.js`) - Auto-generate CLAUDE.md from planning files
- **PRGate** (`lib/gates/pr-gate.js`) - Quality gates: tests, uncommitted changes, branch status, blocking issues

### Changed
- Command count increased from 40 to 43
- Test count increased to 618 tests (from 557 in v3.3)
- Enhanced modular architecture with caching, indexing, and hooks

---

## [3.3.0] - 2025-01-24

### Added

#### Documentation
- **GETTING-STARTED.md** - Step-by-step tutorial with two paths (new project, existing codebase)
- **COMMANDS.md** - Comprehensive reference for all 40 GYWD commands
- **EXAMPLES.md** - Three workflow examples (greenfield, brownfield, daily development)
- **CONTRIBUTING.md** - Developer guide with error handling patterns and test coverage info
- **docs/README.md** - Documentation index with navigation

#### npm Publishing
- `.npmignore` for explicit package content control
- `docs/` directory included in npm package

### Changed
- **README.md** completely rewritten
  - Reduced from 708 to 553 lines (-22%)
  - New tagline: "Ship faster with AI that remembers your decisions"
  - Reorganized commands into Daily Workflow first
  - Updated architecture diagram to v3.2
  - Streamlined Quick Start to 3 steps
- Test coverage now documented in CONTRIBUTING.md
  - Statements: 77.6%, Branches: 64.7%, Functions: 85.4%, Lines: 79.5%
  - Priority areas identified for improvement

---

## [3.2.0] - 2025-01-20

### Added

#### Enhanced Learning System - Memory Module (`lib/memory/`)
- **GlobalMemory** - Cross-project pattern persistence
  - Stores patterns, expertise, preferences across all projects
  - Persistent storage in `~/.gywd/global/`
  - Pattern recording with confidence scoring
  - Expertise tracking by domain
  - Project registration and metadata

- **PatternAggregator** - Cross-project pattern analysis
  - Consensus detection across multiple projects
  - Outlier identification and reporting
  - Configurable confidence thresholds
  - Bayesian confidence boosting
  - Pattern recommendations by type

- **FeedbackCollector** - Suggestion outcome tracking
  - Records suggestion acceptance/rejection
  - Category and type-based statistics
  - Acceptance rate calculation
  - Suppression detection for poor suggestions
  - Performance trend analysis

- **ConfidenceCalibrator** - Bayesian confidence scoring
  - Beta-Binomial Bayesian updating
  - Posterior mean and variance calculation
  - Credible interval estimation
  - Brier score for prediction accuracy
  - Calibration analysis with bins

- **TeamSync** - Team pattern sharing
  - Export patterns for team sharing
  - Import with conflict resolution strategies
  - Multiple resolution strategies: majority, highest_confidence, newest, merge_all
  - Team export merging
  - Validation utilities

#### Integration Tests
- Full memory module integration test suite
  - GlobalMemory + PatternAggregator interaction
  - FeedbackCollector + ConfidenceCalibrator pipeline
  - GlobalMemory + TeamSync export/import
  - Full learning pipeline tests
  - Cross-module data flow verification

### Changed
- Test count increased to 557 tests (from 390 in v3.0)
- Enhanced modular architecture with memory persistence

---

## [3.0.0] - 2025-01-11

### Added

#### Sophisticated Brain System
- **Developer Digital Twin** (`lib/profile/`) - Learns and adapts to developer patterns
  - `ProfileManager` - Persistent profile storage with preferences, expertise, and patterns
  - `PatternLearner` - Observes code to learn naming conventions, paradigms, and styles
  - Cognitive and communication style tracking
  - Language and framework expertise tracking

- **Adaptive Questioning Engine** (`lib/questioning/`) - Context-aware question optimization
  - `QuestionEngine` - Smart question filtering and adaptation
  - Question inference system to skip already-known information
  - Expert vs beginner question text variants
  - Priority-based question ordering
  - `createQuestion()` factory with full configuration

- **Context Predictor** (`lib/context/`) - Intelligent file relationship analysis
  - `ContextAnalyzer` - Analyzes file relationships, imports, and keywords
  - `ContextPredictor` - Predicts relevant files for tasks based on history
  - `ContextCache` - Efficient caching for predictions
  - Co-access pattern learning
  - Export/import for persistence

#### Automation Framework
- **Dependency Analyzer** (`lib/automation/dependency-analyzer.js`)
  - Analyzes project dependency graphs
  - Detects circular dependencies
  - Generates DOT format graphs
  - Creates markdown reports
  - Identifies dependency layers

- **Test Generator** (`lib/automation/test-generator.js`)
  - Auto-generates test stubs for Jest and Mocha
  - Extracts exports, functions, and classes from source
  - Handles async functions, static methods, and ES6 syntax
  - Dry-run mode for preview

- **Doc Generator** (`lib/automation/doc-generator.js`)
  - Generates markdown documentation from JSDoc
  - Creates API index files
  - Parses complex JSDoc annotations
  - Supports classes, functions, and modules

#### Validation Framework
- **Schema Validator** (`lib/validators/schema-validator.js`)
  - JSON Schema draft-07 validation
  - Deep structural analysis
  - Enum and type validation

- **Command Validator** (`lib/validators/command-validator.js`)
  - Validates command markdown files
  - Checks required sections and structure
  - Workflow reference validation

- **Workflow Validator** (`lib/validators/workflow-validator.js`)
  - Phase definition validation
  - Task structure checking

#### CI/CD Pipeline
- GitHub Actions workflow (`ci.yml`)
  - Multi-platform testing (Windows, macOS, Linux)
  - Multi-Node version testing (16, 18, 20, 22)
  - Coverage reporting with Jest
- Release workflow (`release.yml`)
  - Automated NPM publishing on tags
- ESLint configuration with zero runtime dependencies
- Pre-commit hooks for quality gates

#### Scripts
- `npm run validate:schemas` - Validate all JSON schemas
- `npm run validate:commands` - Validate command structure
- `npm run validate:all` - Run all validations
- `npm run generate:tests` - Generate test stubs
- `npm run generate:docs` - Generate documentation
- `npm run analyze:deps` - Analyze dependencies
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix lint issues

### Changed
- Reorganized lib structure into modular components
- Enhanced test coverage to 390 tests (from ~50 in v2.0)
- Improved error handling across all modules

### Testing
- **Unit Tests**: 300+ tests for individual modules
- **Integration Tests**: Brain component interaction tests
- **E2E Tests**: Full workflow from profile to automation
- Test coverage targeting 80%+

## [2.0.0] - 2024-12-XX

### Added
- Unified Intelligence System
- Meta-prompting with context engineering
- Decision Intelligence - understanding WHY code exists
- Core commands: `/gywd:progress`, `/gywd:status`, `/gywd:init`
- Profile schema for developer preferences
- Spec-driven development patterns

### Changed
- Complete architectural overhaul from v1.x
- Renamed from GSD to GYWD (Get Your Work Done)

## [1.4.0] - 2024-XX-XX

### Added
- Decision Intelligence features
- Context budget management
- Health dashboard
- Partial plan execution

## [1.3.0] - 2024-XX-XX

### Added
- Memory system for multi-session persistence
- Drift detection between specs and implementation
- Dependency visualization
- Confidence scoring

## [1.2.0] - 2024-XX-XX

### Added
- Digest generation
- Rollback functionality
- GitHub sync
- Adaptive decomposition

## [1.1.0] - 2024-XX-XX

### Added
- Status command
- Init command
- Basic testing framework

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- Core installation system
- Command installation
- Reference documentation installation

---

[4.0.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v3.4.0...v4.0.0
[3.4.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v3.3.0...v3.4.0
[3.3.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v3.0.0...v3.2.0
[3.0.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v1.4.0...v2.0.0
[1.4.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/cyberbloke9/pmp-gywd/releases/tag/v1.0.0
