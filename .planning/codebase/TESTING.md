# Testing

## Current State

**No automated test suite exists.** The codebase uses manual validation through:

1. CLI execution testing
2. Command validation via `/gywd:` invocation
3. Checkpoint-based verification during workflow execution

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

## Recommended Test Approach

If adding tests, follow this structure:

### Test Location
```
tests/
├── install.test.js      # Installation script tests
├── commands/            # Command validation tests
└── fixtures/            # Test data
```

### Test Commands
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run coverage      # Coverage report
```

### What to Test

| Priority | Area | Test Type |
|----------|------|-----------|
| High | install.js | Unit - file operations, path handling |
| High | Path expansion | Unit - tilde expansion, Windows paths |
| Medium | Command loading | Integration - plugin.json validity |
| Low | Workflows | Manual - Claude execution |

## Validation Currently Performed

| Check | Location | Type |
|-------|----------|------|
| Node version | package.json engines | Runtime |
| Directory exists | install.js | Pre-install |
| Config valid | workflows | Pre-execution |
| Git initialized | commands | Pre-commit |
