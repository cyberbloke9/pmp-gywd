/**
 * Jest Configuration for PMP-GYWD v3.0
 *
 * Enhanced configuration with coverage thresholds,
 * multiple test environments, and CI integration.
 */
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
  ],

  // Coverage configuration
  collectCoverage: false, // Enable via --coverage flag
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    'bin/**/*.js',
    'lib/**/*.js',
    'scripts/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
  ],

  // Coverage thresholds (relaxed for initial CI, tighten in Sprint 8)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],

  // Reporters (jest-junit used only in CI)
  reporters: process.env.CI
    ? ['default', ['jest-junit', {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
      }]]
    : ['default'],

  // Timeouts
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Fail on console errors in tests
  errorOnDeprecated: true,

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Transform (none needed - pure Node.js)
  transform: {},

  // Global setup/teardown
  // globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
  // globalTeardown: '<rootDir>/tests/helpers/globalTeardown.js',
};
