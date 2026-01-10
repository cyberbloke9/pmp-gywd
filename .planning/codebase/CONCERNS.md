# Concerns

## High Priority

### 1. Error Handling in install.js

**Issue:** No try-catch around file system operations

```javascript
// Current (no error handling)
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(srcPath, destPath);

// Should have error handling for:
// - Permission denied
// - Disk full
// - Invalid paths
// - File already exists
```

**Impact:** Silent failures during installation

**Fix:** Wrap fs operations in try-catch with user-friendly error messages

### 2. Naming Inconsistency

**Issue:** Mixed naming throughout codebase
- Package: `pmp-gywd`
- Commands: `/gywd:`
- Some docs reference `/gsd:` (original name)
- Internal references to "GSD" vs "GYWD"

**Impact:** User confusion, broken references

**Fix:** Global find-replace to standardize on GYWD

### 3. Path Validation Missing

**Issue:** No validation for:
- Path traversal attacks (`../../../etc/passwd`)
- Invalid characters in paths
- Symbolic link handling
- Windows path edge cases

**Impact:** Security risk, potential crashes

## Medium Priority

### 4. Parallel Agent Coordination

**Issue:** `map-codebase` spawns 4 parallel agents without:
- Timeout mechanism
- Error aggregation
- Conflict prevention (same file writes)
- Coordination between agents

**Impact:** Potential race conditions, incomplete analysis

### 5. State Recovery Undefined

**Issue:** If STATE.md is corrupted or missing:
- "Reconstruct or continue without" mentioned but not implemented
- No mechanism defined for state reconstruction
- Stale state possible with multiple sessions

**Impact:** Lost context, manual recovery needed

### 6. Configuration Validation

**Issue:** config.json values not validated:
- Invalid mode values not caught
- Gate typos pass silently
- Missing required fields not detected

**Impact:** Unexpected behavior, silent failures

### 7. Decimal Phase Complexity

**Issue:** Phase numbering (2.1, 2.2) requires complex validation:
- Integer phase must exist
- Next integer must exist
- Decimal must not exist
- No code shown for this validation

**Impact:** Invalid phase structures possible

## Low Priority

### 8. Hardcoded Values

| Value | Location | Should Be |
|-------|----------|-----------|
| "2-3 tasks per plan" | scope-estimation.md | Configurable |
| "200k context" | multiple | Runtime validated |
| "50% context target" | scope-estimation.md | Configurable |

### 9. Missing Tests

**Current state:** No automated test suite
- Installation script untested
- Path handling untested
- Cross-platform behavior unverified

### 10. Documentation Gaps

- Subagent prompt format not formally specified
- PLAN.md structure has no schema validation
- Success criteria are manual checklists only

## Technical Debt Summary

| Category | Count | Severity |
|----------|-------|----------|
| Error Handling | 8 issues | High |
| Naming/Consistency | 4 issues | High |
| Validation | 6 issues | Medium |
| Testing | 3 issues | Medium |
| Documentation | 4 issues | Low |

## Recommended Actions

1. **Immediate:** Add error handling to install.js
2. **Immediate:** Standardize GYWD naming throughout
3. **Short-term:** Add path validation and sanitization
4. **Short-term:** Define state recovery mechanism
5. **Medium-term:** Add automated tests for install.js
6. **Long-term:** Add configuration schema validation
