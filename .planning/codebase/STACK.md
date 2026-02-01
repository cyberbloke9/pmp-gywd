# Stack

## Languages

| Language | Usage | Files |
|----------|-------|-------|
| **JavaScript** | Primary - Lib modules, install script, tests | 50+ .js files |
| **Markdown** | Commands, workflows, templates, documentation | 70+ .md files |
| **JSON** | Configuration | package.json, plugin.json, config.json |

## Runtime Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >=16.7.0 | Specified in package.json engines |
| npm | Any | For npx installation |

## Frameworks & Libraries

### Runtime Dependencies
**None** - Pure Node.js with built-in modules only:
- `fs` - File system operations
- `path` - Cross-platform path handling
- `os` - OS detection, home directory
- `readline` - Interactive CLI prompts
- `crypto` - Hash generation
- `events` - EventEmitter for messaging

### Dev Dependencies
- `jest` - Test framework (618 tests)
- `eslint` - Code linting

## Library Modules (20+)

### v4.0 Autonomous Intelligence
| Module | Location | Purpose |
|--------|----------|---------|
| Agents | `lib/agents/` | BaseAgent, CriticAgent, RedTeamAgent, ChaosAgent, SkepticAgent, DevilsAdvocateAgent, AgentOrchestrator |
| Permissions | `lib/permissions/` | OperationClassifier, RiskScorer, PermissionRouter |
| Analytics | `lib/analytics/` | ModelGeneratorAgent, TestGeneratorAgent, ReviewAgent |
| Grilling | `lib/grilling/` | PlanChallengerAgent, ChangeValidatorAgent, DecisionGrillerAgent |
| Multi-Agent | `lib/multi-agent/` | MultiAgentCoordinator, MessageQueue, CloudSyncManager, TeamSyncManager |
| Plugins | `lib/plugins/` | PluginLoader, PluginMarketplace |
| Dashboard | `lib/dashboard/` | DashboardRenderer |

### v3.4 Enhanced Experience
| Module | Location | Purpose |
|--------|----------|---------|
| Cache | `lib/cache/` | MetadataCache with LRU eviction |
| Index | `lib/index/` | KeywordIndex for O(1) lookups |
| CLI | `lib/cli/` | ProgressIndicator, TaskRunner |
| Errors | `lib/errors/` | ErrorFormatter with suggestions |
| Gates | `lib/gates/` | PRGate quality checks |
| Hooks | `lib/hooks/` | HookManager pre/post hooks |
| Metrics | `lib/metrics/` | MetricsDashboard |
| Sync | `lib/sync/` | ClaudeMdGenerator |

### v3.0-3.2 Intelligence
| Module | Location | Purpose |
|--------|----------|---------|
| Brain | `lib/brain/` | Core orchestration |
| Context | `lib/context/` | ContextAnalyzer, ContextPredictor, ContextCache |
| Memory | `lib/memory/` | GlobalMemory, PatternAggregator, FeedbackCollector, ConfidenceCalibrator, TeamSync |
| Profile | `lib/profile/` | ProfileManager, PatternLearner |
| Questioning | `lib/questioning/` | QuestionEngine |
| Automation | `lib/automation/` | DependencyAnalyzer, TestGenerator, DocGenerator |
| Validators | `lib/validators/` | SchemaValidator, CommandValidator, WorkflowValidator |

## Package Configuration

```json
{
  "name": "pmp-gywd",
  "version": "4.0.0",
  "bin": { "pmp-gywd": "bin/install.js" },
  "engines": { "node": ">=16.7.0" },
  "keywords": ["claude-code", "context-engineering", "autonomous-agents", "multi-agent"]
}
```

## Key Design Decision

Zero external runtime dependencies - the entire system runs on Node.js built-ins. Dev dependencies (Jest, ESLint) are for development only and not required at runtime.

---
*Last updated: 2026-02-01 - v4.0.0*
