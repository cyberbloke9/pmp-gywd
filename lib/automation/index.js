/**
 * Automation Module
 *
 * Tools for automating development workflows:
 * - Dependency analysis
 * - Test generation
 * - Documentation generation
 */

const {
  DependencyAnalyzer,
  DEP_TYPES,
  BUILTIN_MODULES,
} = require('./dependency-analyzer');

const {
  TestGenerator,
  TEST_FRAMEWORKS,
} = require('./test-generator');

const {
  DocGenerator,
  DOC_TYPES,
} = require('./doc-generator');

module.exports = {
  // Classes
  DependencyAnalyzer,
  TestGenerator,
  DocGenerator,

  // Constants
  DEP_TYPES,
  BUILTIN_MODULES,
  TEST_FRAMEWORKS,
  DOC_TYPES,

  // Factory functions
  createDependencyAnalyzer: (options) => new DependencyAnalyzer(options),
  createTestGenerator: (options) => new TestGenerator(options),
  createDocGenerator: (options) => new DocGenerator(options),
};
