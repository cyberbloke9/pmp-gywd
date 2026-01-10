/**
 * Jest Setup File
 *
 * Runs before each test file.
 * Sets up global test utilities and mocks.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Store original process.env
const originalEnv = { ...process.env };

// Store original cwd
const originalCwd = process.cwd();

// Test fixtures directory
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

// Temporary test directory (created per test suite if needed)
let tempTestDir = null;

/**
 * Create a temporary directory for test files
 */
global.createTempDir = () => {
  tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gywd-test-'));
  return tempTestDir;
};

/**
 * Get path to a fixture file
 */
global.getFixture = (relativePath) => {
  return path.join(FIXTURES_DIR, relativePath);
};

/**
 * Read a fixture file
 */
global.readFixture = (relativePath) => {
  const fixturePath = path.join(FIXTURES_DIR, relativePath);
  return fs.readFileSync(fixturePath, 'utf8');
};

/**
 * Mock console methods for clean test output
 */
global.mockConsole = () => {
  const mocks = {
    log: jest.spyOn(console, 'log').mockImplementation(() => {}),
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
  };
  return mocks;
};

/**
 * Restore console methods
 */
global.restoreConsole = (mocks) => {
  Object.values(mocks).forEach(mock => mock.mockRestore());
};

// Before each test
beforeEach(() => {
  // Reset process.env
  process.env = { ...originalEnv };
});

// After each test
afterEach(() => {
  // Clean up temp directory if created
  if (tempTestDir && fs.existsSync(tempTestDir)) {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
    tempTestDir = null;
  }

  // Restore cwd if changed
  if (process.cwd() !== originalCwd) {
    process.chdir(originalCwd);
  }
});

// Global timeout for slow operations
jest.setTimeout(30000);

// Suppress console output during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    // Keep error and warn for debugging
    error: console.error,
    warn: console.warn,
  };
}
