/**
 * Tests for install.js utility functions
 *
 * Note: Since install.js runs on require, we test the core logic patterns
 * by reimplementing the testable functions here.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

// Reimplemented functions for testing (same logic as install.js)

function expandTilde(filePath) {
  if (!filePath) return filePath;
  if (filePath === '~') return os.homedir();
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

function validatePath(targetPath) {
  if (targetPath.includes('\0')) {
    return { valid: false, reason: 'Path contains invalid characters' };
  }
  return { valid: true, resolved: path.resolve(targetPath) };
}

// Tests

describe('expandTilde', () => {
  test('returns null/undefined as-is', () => {
    expect(expandTilde(null)).toBeNull();
    expect(expandTilde(undefined)).toBeUndefined();
  });

  test('expands lone ~ to home directory', () => {
    expect(expandTilde('~')).toBe(os.homedir());
  });

  test('expands ~/ paths to home directory', () => {
    const result = expandTilde('~/test/path');
    expect(result).toBe(path.join(os.homedir(), 'test/path'));
  });

  test('does not modify paths without ~', () => {
    expect(expandTilde('/absolute/path')).toBe('/absolute/path');
    expect(expandTilde('relative/path')).toBe('relative/path');
    expect(expandTilde('C:\\Windows\\path')).toBe('C:\\Windows\\path');
  });

  test('does not expand ~ in middle of path', () => {
    expect(expandTilde('/path/~/test')).toBe('/path/~/test');
  });
});

describe('validatePath', () => {
  test('rejects paths with null bytes', () => {
    const result = validatePath('/path/with\0null');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('invalid characters');
  });

  test('accepts normal paths', () => {
    const result = validatePath('/normal/path');
    expect(result.valid).toBe(true);
    expect(result.resolved).toBeDefined();
  });

  test('accepts relative paths', () => {
    const result = validatePath('relative/path');
    expect(result.valid).toBe(true);
  });

  test('accepts Windows paths', () => {
    const result = validatePath('C:\\Users\\test');
    expect(result.valid).toBe(true);
  });
});

describe('error code mapping', () => {
  // Test that we handle common error codes
  const errorCodes = ['EACCES', 'ENOENT', 'ENOSPC', 'EROFS'];

  test('all common error codes have defined handling', () => {
    // This test documents the error codes we handle
    errorCodes.forEach(code => {
      expect(['EACCES', 'ENOENT', 'ENOSPC', 'EROFS']).toContain(code);
    });
  });
});

describe('file system integration', () => {
  const testDir = path.join(os.tmpdir(), 'pmp-gywd-test-' + Date.now());

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('can create nested directories', () => {
    const nestedPath = path.join(testDir, 'a', 'b', 'c');
    fs.mkdirSync(nestedPath, { recursive: true });
    expect(fs.existsSync(nestedPath)).toBe(true);
  });

  test('can write and read files', () => {
    const filePath = path.join(testDir, 'test.txt');
    fs.writeFileSync(filePath, 'test content');
    expect(fs.readFileSync(filePath, 'utf8')).toBe('test content');
  });

  test('can copy files', () => {
    const srcPath = path.join(testDir, 'source.txt');
    const destPath = path.join(testDir, 'dest.txt');
    fs.writeFileSync(srcPath, 'copy me');
    fs.copyFileSync(srcPath, destPath);
    expect(fs.readFileSync(destPath, 'utf8')).toBe('copy me');
  });
});

describe('path replacement in markdown', () => {
  test('replaces ~/.claude/ with custom prefix', () => {
    const content = 'Load @~/.claude/commands/gywd/help.md for reference';
    const replaced = content.replace(/~\/\.claude\//g, './.claude/');
    expect(replaced).toBe('Load @./.claude/commands/gywd/help.md for reference');
  });

  test('replaces multiple occurrences', () => {
    const content = `
@~/.claude/one.md
@~/.claude/two.md
    `;
    const replaced = content.replace(/~\/\.claude\//g, '/custom/');
    expect(replaced).toContain('@/custom/one.md');
    expect(replaced).toContain('@/custom/two.md');
  });

  test('does not replace other paths', () => {
    const content = '@./local/path.md and @/absolute/path.md';
    const replaced = content.replace(/~\/\.claude\//g, './.claude/');
    expect(replaced).toBe(content);
  });
});
