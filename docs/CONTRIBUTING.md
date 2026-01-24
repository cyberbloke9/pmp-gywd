# Contributing to GYWD

Thank you for your interest in contributing to GYWD!

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Conventions](#code-conventions)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Pull Request Guidelines](#pull-request-guidelines)

---

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn

---

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Run tests: `npm test`

---

## Development Setup

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/pmp-gywd.git
cd pmp-gywd
npm install

# Run tests
npm test

# Run linter
npm run lint

# Run all checks (before committing)
npm run precommit
```

### Project Structure

```
pmp-gywd/
├── commands/gywd/     # Slash command definitions
├── lib/               # JavaScript modules
│   ├── automation/    # DependencyAnalyzer, TestGenerator, DocGenerator
│   ├── brain/         # Core intelligence
│   ├── context/       # ContextAnalyzer, ContextPredictor, ContextCache
│   ├── memory/        # GlobalMemory, PatternAggregator, TeamSync
│   ├── profile/       # ProfileManager, PatternLearner
│   ├── questioning/   # QuestionEngine
│   └── validators/    # Schema and command validators
├── get-your-work-done/ # Workflow definitions
├── tests/             # Jest test suites
└── docs/              # Documentation
```

---

## Code Conventions

### General

- Use `'use strict';` at the top of all JS files
- Use JSDoc comments for all public functions
- Zero external runtime dependencies in lib/
- Keep functions focused and small

### Naming

```javascript
// Classes: PascalCase
class PatternAggregator {}

// Functions/methods: camelCase
function calculateConfidence() {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_PATTERNS = 1000;

// Files: kebab-case
// pattern-aggregator.js
```

### Module Exports

```javascript
// Each module has index.js that exports public API
module.exports = {
  ClassName,
  functionName,
  CONSTANT_NAME,
};
```

---

## Error Handling

GYWD uses specific patterns for error handling. **Follow these conventions.**

### Pattern 1: Result Objects for Validation

Return `{valid, error, data}` objects instead of throwing:

```javascript
// ✅ Good - Result pattern
function validateConfig(config) {
  if (!config.name) {
    return { valid: false, error: 'Missing required field: name' };
  }
  return { valid: true, data: config };
}

// ❌ Bad - Throwing
function validateConfig(config) {
  if (!config.name) {
    throw new Error('Missing required field: name');
  }
  return config;
}
```

### Pattern 2: Safe Defaults for File Operations

Use try/catch with sensible defaults:

```javascript
// ✅ Good - Safe loading with default
function loadConfig(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    // Log but don't crash
    console.warn(`Could not load ${filePath}: ${error.message}`);
  }
  return {}; // Return safe default
}

// ❌ Bad - Crashes on missing/invalid file
function loadConfig(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
```

### Pattern 3: Error Arrays for Multiple Issues

When validating complex objects, collect all errors:

```javascript
// ✅ Good - Collect all errors
function validateSchema(schema) {
  const errors = [];

  if (!schema.title) errors.push('Missing title');
  if (!schema.type) errors.push('Missing type');
  if (schema.required && !Array.isArray(schema.required)) {
    errors.push('Required must be an array');
  }

  return { valid: errors.length === 0, errors };
}
```

### Pattern 4: Graceful Degradation

Operations should degrade gracefully, not fail completely:

```javascript
// ✅ Good - Graceful degradation
function getPatterns(projectPath) {
  const patterns = [];

  // Try global patterns
  try {
    patterns.push(...loadGlobalPatterns());
  } catch (e) {
    // Continue without global patterns
  }

  // Try project patterns
  try {
    patterns.push(...loadProjectPatterns(projectPath));
  } catch (e) {
    // Continue without project patterns
  }

  return patterns; // Always returns array, possibly empty
}
```

### Error Message Guidelines

- Be specific: `"Missing required field: name"` not `"Invalid input"`
- Include context: `"Could not load config from /path/to/file"`
- Suggest fixes: `"Run /gywd:init to create missing .planning/ directory"`
- Use consistent format: `"[Module] Error: description"`

---

## Testing

### Requirements

- All PRs must pass the full test suite (557 tests)
- New features need tests
- Bug fixes need regression tests

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/memory.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Test Structure

```javascript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle normal input', () => {
      // Test normal case
    });

    it('should handle edge case', () => {
      // Test edge case
    });

    it('should return error for invalid input', () => {
      // Test error handling
    });
  });
});
```

### What to Test

- Normal operation (happy path)
- Edge cases (empty input, large input, special characters)
- Error conditions (invalid input, missing files)
- Boundary conditions (min/max values)

---

## Pull Request Guidelines

### Before Submitting

1. Run `npm run precommit` (tests + lint)
2. Update documentation if needed
3. Add tests for new features
4. Keep PRs focused (one feature/fix per PR)

### PR Title Format

```
type(scope): description

Examples:
feat(memory): add pattern expiration
fix(validators): handle empty schema
docs(readme): update installation steps
test(context): add cache invalidation tests
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`

### PR Description

Include:
- What the PR does
- Why it's needed
- How to test it
- Any breaking changes

### Review Process

1. Automated checks must pass
2. At least one maintainer review
3. Address feedback promptly
4. Squash commits before merge

---

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Use discussions for questions

---

*Thank you for contributing to GYWD!*
