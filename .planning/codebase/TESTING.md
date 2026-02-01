# Testing

## Current State

**618 automated tests** across 25 test suites using Jest. Multi-platform CI/CD with 12 matrix combinations (3 OS × 4 Node versions).

## Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 618 |
| Test Suites | 25 |
| Coverage Target | 80%+ |
| Statements | 77.6% |
| Branches | 64.7% |
| Functions | 85.4% |
| Lines | 79.5% |

## Test Organization

```
tests/
├── agents/                    # Agent Runtime tests
│   ├── base-agent.test.js
│   ├── agent-types.test.js
│   └── agent-orchestrator.test.js
├── analytics/                 # Analytics Agent tests
│   ├── model-generator.test.js
│   ├── test-generator.test.js
│   └── review-agent.test.js
├── automation/                # Automation tests
│   ├── dependency-analyzer.test.js
│   ├── test-generator.test.js
│   └── doc-generator.test.js
├── brain/                     # Brain tests
├── cache/                     # Cache tests
│   └── metadata-cache.test.js
├── cli/                       # CLI UX tests
│   └── progress-indicator.test.js
├── context/                   # Context tests
│   ├── context-analyzer.test.js
│   ├── context-predictor.test.js
│   └── context-cache.test.js
├── dashboard/                 # Dashboard tests
│   └── dashboard-renderer.test.js
├── errors/                    # Error handling tests
│   └── error-formatter.test.js
├── gates/                     # Quality gate tests
│   └── pr-gate.test.js
├── grilling/                  # Self-grilling tests
│   ├── plan-challenger.test.js
│   ├── change-validator.test.js
│   └── decision-griller.test.js
├── hooks/                     # Hook system tests
│   └── hook-manager.test.js
├── index/                     # Indexing tests
│   └── keyword-index.test.js
├── memory/                    # Memory module tests
│   ├── global-memory.test.js
│   ├── pattern-aggregator.test.js
│   ├── feedback-collector.test.js
│   ├── confidence-calibrator.test.js
│   └── team-sync.test.js
├── metrics/                   # Metrics tests
│   └── dashboard.test.js
├── multi-agent/               # Multi-agent tests
│   ├── coordinator.test.js
│   ├── message-queue.test.js
│   ├── cloud-sync.test.js
│   └── team-sync.test.js
├── permissions/               # Permission tests
│   ├── operation-classifier.test.js
│   ├── risk-scorer.test.js
│   └── permission-router.test.js
├── plugins/                   # Plugin system tests
│   ├── plugin-loader.test.js
│   └── marketplace.test.js
├── profile/                   # Profile tests
│   ├── profile-manager.test.js
│   └── pattern-learner.test.js
├── questioning/               # Questioning tests
│   └── question-engine.test.js
├── sync/                      # Sync tests
│   └── claude-md-generator.test.js
├── validators/                # Validator tests
│   ├── schema-validator.test.js
│   ├── command-validator.test.js
│   └── workflow-validator.test.js
└── integration/               # Integration tests
    └── memory-integration.test.js
```

## Test Commands

```bash
npm test              # Run all 618 tests
npm run test:watch    # Watch mode for development
npm run coverage      # Generate coverage report
npm run test:ci       # CI mode with coverage
```

## CI/CD Pipeline

### GitHub Actions Matrix

| OS | Node 16 | Node 18 | Node 20 | Node 22 |
|----|---------|---------|---------|---------|
| Ubuntu | ✅ | ✅ | ✅ | ✅ |
| macOS | ✅ | ✅ | ✅ | ✅ |
| Windows | ✅ | ✅ | ✅ | ✅ |

### Pipeline Stages

1. **Lint** - ESLint with zero external plugins
2. **Test** - Jest with coverage
3. **Validate** - Schema, command, workflow validators
4. **Security** - npm audit

## Quality Assurance Patterns

### Verification Checkpoints

Commands use blocking gates for user confirmation:

```xml
<task type="checkpoint:human-verify" gate="blocking">
  <name>Verify implementation</name>
  <action>Review the generated code</action>
</task>
```

### Pre-Execution Validation

Workflows validate state before proceeding:
- Git repository existence checks
- `.planning/` directory validation
- Configuration file presence
- Brownfield detection for existing code

### Decision Gates

```xml
<task type="checkpoint:decision" gate="blocking">
  <name>Choose approach</name>
  <options>
    <option value="A">Fast but risky</option>
    <option value="B">Safe but slow</option>
  </options>
</task>
```

## Test Coverage by Module

| Module | Tests | Coverage |
|--------|-------|----------|
| Agents | 45+ | 85% |
| Analytics | 35+ | 82% |
| Automation | 40+ | 78% |
| Context | 50+ | 80% |
| Grilling | 35+ | 84% |
| Memory | 60+ | 85% |
| Multi-Agent | 40+ | 80% |
| Permissions | 45+ | 88% |
| Plugins | 30+ | 75% |
| Profile | 35+ | 82% |
| Questioning | 30+ | 80% |
| Validators | 40+ | 85% |

## Writing Tests

### Test File Structure

```javascript
const { ModuleName } = require('../../lib/category/module-name');

describe('ModuleName', () => {
  let instance;

  beforeEach(() => {
    instance = new ModuleName();
  });

  afterEach(() => {
    instance.cleanup();
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      const result = instance.methodName('input');
      expect(result).toBeDefined();
    });

    it('should handle edge case', () => {
      expect(() => instance.methodName(null)).toThrow();
    });
  });
});
```

### Mock Patterns

```javascript
// Mock file system
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn()
}));

// Mock time
jest.useFakeTimers();
jest.setSystemTime(new Date('2026-02-01'));
```

---
*Last updated: 2026-02-01 - v4.0.0*
