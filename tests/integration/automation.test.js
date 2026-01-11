/**
 * Automation Framework Integration Tests
 *
 * Tests the integration between DependencyAnalyzer, TestGenerator, and DocGenerator.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  DependencyAnalyzer,
  TestGenerator,
  DocGenerator,
  DEP_TYPES,
  TEST_FRAMEWORKS,
  DOC_TYPES,
} = require('../../lib/automation');

describe('Automation Integration', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'automation-integration-'));

    // Create a simple project structure
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });

    fs.writeFileSync(
      path.join(testDir, 'src', 'index.js'),
      `
/**
 * Main module
 * @module index
 */
const utils = require('./utils');

/**
 * Main function
 * @param {string} name - Name
 * @returns {string}
 */
function greet(name) {
  return utils.format(name);
}

module.exports = { greet };
`,
    );

    fs.writeFileSync(
      path.join(testDir, 'src', 'utils.js'),
      `
/**
 * Utilities
 * @module utils
 */

/**
 * Format a string
 * @param {string} input
 * @returns {string}
 */
function format(input) {
  return input.toUpperCase();
}

module.exports = { format };
`,
    );
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Dependency Analysis', () => {
    test('analyzes project dependencies', () => {
      const analyzer = new DependencyAnalyzer({ rootDir: testDir });
      const analysis = analyzer.analyze();

      expect(analysis.files).toBe(2);
      expect(analysis.circular).toEqual([]);
      expect(analysis.dependencies).toBeDefined();
    });

    test('detects no circular dependencies in simple project', () => {
      const analyzer = new DependencyAnalyzer({ rootDir: testDir });
      const analysis = analyzer.analyze();

      expect(analysis.circular.length).toBe(0);
    });

    test('generates DOT graph', () => {
      const analyzer = new DependencyAnalyzer({ rootDir: testDir });
      analyzer.analyze();
      const dot = analyzer.toDot();

      expect(dot).toContain('digraph');
    });

    test('generates markdown report', () => {
      const analyzer = new DependencyAnalyzer({ rootDir: testDir });
      analyzer.analyze();
      const md = analyzer.toMarkdown();

      expect(md).toContain('Dependency Analysis Report');
    });
  });

  describe('Test Generation', () => {
    test('generates test stubs for project', () => {
      const generator = new TestGenerator({
        testDir: path.join(testDir, 'tests'),
        sourceDir: path.join(testDir, 'src'),
      });

      const results = generator.generateForDirectory(
        path.join(testDir, 'src'),
        true, // dry run
      );

      expect(results.length).toBe(2);
      expect(results[0].content).toContain('describe');
    });

    test('extracts exports from source files', () => {
      const generator = new TestGenerator();
      const analysis = generator.analyzeFile(path.join(testDir, 'src', 'index.js'));

      expect(analysis.exports).toContain('greet');
    });

    test('identifies testable items', () => {
      const generator = new TestGenerator();
      const analysis = generator.analyzeFile(path.join(testDir, 'src', 'utils.js'));

      expect(analysis.testable.length).toBeGreaterThan(0);
      expect(analysis.testable[0].name).toBe('format');
    });
  });

  describe('Documentation Generation', () => {
    test('generates markdown documentation', () => {
      const generator = new DocGenerator({
        outputDir: path.join(testDir, 'docs'),
        sourceDir: path.join(testDir, 'src'),
      });

      const md = generator.generateMarkdown(path.join(testDir, 'src', 'index.js'));

      expect(md).toContain('greet');
      expect(md).toContain('Parameters');
    });

    test('generates API index', () => {
      const generator = new DocGenerator({
        outputDir: path.join(testDir, 'docs'),
        sourceDir: path.join(testDir, 'src'),
      });

      const index = generator.generateApiIndex(path.join(testDir, 'src'));

      expect(index).toContain('API Reference');
    });

    test('parses JSDoc comments', () => {
      const generator = new DocGenerator();
      const content = `
        /**
         * Test function
         * @param {string} x - Input
         * @returns {string} Output
         */
        function test(x) {}
      `;

      const docs = generator.parseJSDoc(content);
      expect(docs.length).toBe(1);
      expect(docs[0].params.length).toBe(1);
    });
  });

  describe('Full Pipeline', () => {
    test('analyze -> test -> doc pipeline', () => {
      const srcDir = path.join(testDir, 'src');

      // Step 1: Analyze
      const analyzer = new DependencyAnalyzer({ rootDir: testDir });
      const analysis = analyzer.analyze();
      expect(analysis.files).toBe(2);

      // Step 2: Generate tests
      const testGen = new TestGenerator({
        testDir: path.join(testDir, 'tests'),
        sourceDir: srcDir,
      });
      const tests = testGen.generateForDirectory(srcDir, true);
      expect(tests.length).toBe(2);

      // Step 3: Generate docs
      const docGen = new DocGenerator({
        outputDir: path.join(testDir, 'docs'),
        sourceDir: srcDir,
      });
      const docs = docGen.generateAll(srcDir, true);
      expect(docs.modules.length).toBe(2);
    });
  });
});

describe('Automation Exports', () => {
  test('all automation modules export correctly', () => {
    expect(DependencyAnalyzer).toBeDefined();
    expect(TestGenerator).toBeDefined();
    expect(DocGenerator).toBeDefined();
    expect(DEP_TYPES).toBeDefined();
    expect(TEST_FRAMEWORKS).toBeDefined();
    expect(DOC_TYPES).toBeDefined();
  });

  test('constants have expected values', () => {
    expect(DEP_TYPES.INTERNAL).toBe('internal');
    expect(DEP_TYPES.EXTERNAL).toBe('external');
    expect(DEP_TYPES.BUILTIN).toBe('builtin');

    expect(TEST_FRAMEWORKS.JEST).toBe('jest');
    expect(TEST_FRAMEWORKS.MOCHA).toBe('mocha');

    expect(DOC_TYPES.CLASS).toBe('class');
    expect(DOC_TYPES.FUNCTION).toBe('function');
  });
});
