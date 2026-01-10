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

  // Coverage thresholds (v3.0 targets)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    'bin/install.js': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'lib/brain/**/*.js': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'lib/validators/**/*.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
    }],
  ],

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
