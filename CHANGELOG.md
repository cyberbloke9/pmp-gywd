# Changelog

All notable changes to PMP-GYWD will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[3.3.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v3.0.0...v3.2.0
[3.0.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v1.4.0...v2.0.0
[1.4.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/cyberbloke9/pmp-gywd/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/cyberbloke9/pmp-gywd/releases/tag/v1.0.0
