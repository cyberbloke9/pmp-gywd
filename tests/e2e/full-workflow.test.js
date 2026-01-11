/**
 * End-to-End Workflow Tests
 *
 * Tests the complete GYWD workflow from installation to usage.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
// Import all modules to verify they work together
const { validateJsonSyntax, validateSchemaStructure } = require('../../lib/validators/schema-validator');
const { ProfileManager, PatternLearner } = require('../../lib/profile');
const { QuestionEngine, QUESTION_TYPES, createQuestion } = require('../../lib/questioning');
const { ContextPredictor, ContextAnalyzer, ContextCache } = require('../../lib/context');
const { DependencyAnalyzer, TestGenerator, DocGenerator } = require('../../lib/automation');

describe('E2E: Full GYWD Workflow', () => {
  let testDir;
  let projectDir;

  beforeAll(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gywd-e2e-'));
    projectDir = path.join(testDir, 'test-project');

    // Create a simulated project
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });

    // Create package.json
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        main: 'src/index.js',
      }, null, 2),
    );

    // Create source files
    fs.writeFileSync(
      path.join(projectDir, 'src', 'index.js'),
      `
/**
 * Main module
 * @module index
 */
const utils = require('./utils');

/**
 * Main function
 * @param {string} name - Name to greet
 * @returns {string} Greeting
 */
function greet(name) {
  return utils.formatGreeting(name);
}

module.exports = { greet };
`,
    );

    fs.writeFileSync(
      path.join(projectDir, 'src', 'utils.js'),
      `
/**
 * Utilities
 * @module utils
 */

/**
 * Format a greeting
 * @param {string} name - Name
 * @returns {string} Formatted greeting
 */
function formatGreeting(name) {
  return \`Hello, \${name}!\`;
}

module.exports = { formatGreeting };
`,
    );
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Phase 1: Schema Validation', () => {
    test('validates project JSON files', () => {
      const packageJson = fs.readFileSync(
        path.join(projectDir, 'package.json'),
        'utf-8',
      );

      const result = validateJsonSyntax(packageJson);
      expect(result.valid).toBe(true);
      expect(result.data.name).toBe('test-project');
    });

    test('validates schema structure', () => {
      const schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: 'Test Schema',
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      const errors = validateSchemaStructure(schema);
      expect(errors.length).toBe(0);
    });
  });

  describe('Phase 2: Profile Initialization', () => {
    let profileManager;
    let patternLearner;

    beforeEach(() => {
      profileManager = new ProfileManager(path.join(projectDir, '.claude'));
      patternLearner = new PatternLearner();
    });

    test('initializes developer profile', () => {
      const profile = profileManager.init();

      expect(profile).toBeDefined();
      expect(profile.cognitive).toBeDefined();
      expect(profile.communication).toBeDefined();
    });

    test('learns patterns from project code', () => {
      const indexCode = fs.readFileSync(
        path.join(projectDir, 'src', 'index.js'),
        'utf-8',
      );

      const patterns = patternLearner.observeCode(indexCode, 'index.js');

      expect(patterns).toBeDefined();
      expect(patterns.naming).toBeDefined();
    });

    test('updates profile with learned patterns', () => {
      profileManager.init();

      const code = fs.readFileSync(
        path.join(projectDir, 'src', 'utils.js'),
        'utf-8',
      );
      patternLearner.observeCode(code, 'utils.js');

      profileManager.recordPattern('module_style', 'commonjs');
      profileManager.addLanguage('javascript');

      const profile = profileManager.init();
      expect(profile.tooling.primaryLanguages).toContain('javascript');
    });
  });

  describe('Phase 3: Context Analysis', () => {
    let contextAnalyzer;
    let contextPredictor;
    let contextCache;

    beforeEach(() => {
      contextAnalyzer = new ContextAnalyzer();
      contextPredictor = new ContextPredictor(contextAnalyzer);
      contextCache = new ContextCache();
    });

    test('analyzes project file relationships', () => {
      const indexPath = path.join(projectDir, 'src', 'index.js');
      const utilsPath = path.join(projectDir, 'src', 'utils.js');

      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      const utilsContent = fs.readFileSync(utilsPath, 'utf-8');

      contextAnalyzer.analyzeFile(indexPath, indexContent);
      contextAnalyzer.analyzeFile(utilsPath, utilsContent);

      // Verify files were analyzed
      const summary = contextAnalyzer.getSummary();
      expect(summary.filesAnalyzed).toBe(2);
    });

    test('predicts context for tasks', () => {
      const indexPath = path.join(projectDir, 'src', 'index.js');

      contextPredictor.recordTask('add greeting feature', [indexPath]);

      const prediction = contextPredictor.predictForTask('update greeting');
      expect(prediction.files.length).toBeGreaterThan(0);
    });

    test('caches predictions efficiently', () => {
      const prediction = { files: [{ file: '/test.js', score: 0.8 }] };

      contextCache.cachePrediction('test-key', prediction);

      const cached = contextCache.getPrediction('test-key');
      expect(cached).toEqual(prediction);

      const stats = contextCache.getStats();
      expect(stats.predictions.size).toBe(1);
    });
  });

  describe('Phase 4: Adaptive Questioning', () => {
    let questionEngine;

    beforeEach(() => {
      questionEngine = new QuestionEngine();
    });

    test('creates and filters questions', () => {
      const questions = [
        createQuestion({
          id: 'lang',
          text: 'Primary language?',
          type: QUESTION_TYPES.TECHNICAL,
          key: 'primary_language',
        }),
        createQuestion({
          id: 'framework',
          text: 'Framework?',
          type: QUESTION_TYPES.TECHNICAL,
          skipIfKnown: ['primary_language'],
        }),
      ];

      // Record known language
      questionEngine.recordInference('primary_language', 'javascript', 0.9);

      // Should skip framework question since it depends on known language
      const filtered = questionEngine.filterQuestions(questions);
      expect(filtered.some(q => q.id === 'framework')).toBe(false);
    });

    test('tracks question history', () => {
      questionEngine.recordAnswer('q1', 'answer1', {});
      questionEngine.recordAnswer('q2', 'answer2', {});

      const summary = questionEngine.getHistorySummary();
      expect(summary.totalAsked).toBe(2);
    });
  });

  describe('Phase 5: Automation Framework', () => {
    let analyzer;
    let testGenerator;
    let docGenerator;

    beforeEach(() => {
      analyzer = new DependencyAnalyzer({ rootDir: projectDir });
      testGenerator = new TestGenerator({
        testDir: path.join(projectDir, 'tests'),
        sourceDir: path.join(projectDir, 'src'),
      });
      docGenerator = new DocGenerator({
        outputDir: path.join(projectDir, 'docs'),
        sourceDir: path.join(projectDir, 'src'),
      });
    });

    test('analyzes project dependencies', () => {
      const analysis = analyzer.analyze();

      expect(analysis.files).toBe(2);
      expect(analysis.circular).toEqual([]);
      expect(analysis.layers).toBeDefined();
    });

    test('generates test stubs', () => {
      const results = testGenerator.generateForDirectory(
        path.join(projectDir, 'src'),
        true, // dry run
      );

      expect(results.length).toBe(2);
      expect(results[0].content).toContain('describe');
    });

    test('generates documentation', () => {
      const results = docGenerator.generateAll(
        path.join(projectDir, 'src'),
        true, // dry run
      );

      expect(results.modules.length).toBe(2);
      expect(results.index.content).toContain('API Reference');
    });
  });

  describe('Phase 6: Full Integration', () => {
    test('complete workflow from profile to automation', async () => {
      // 1. Initialize profile
      const profileManager = new ProfileManager(path.join(projectDir, '.claude'));
      profileManager.init();
      profileManager.addLanguage('javascript');

      // 2. Learn patterns
      const patternLearner = new PatternLearner();
      const code = fs.readFileSync(
        path.join(projectDir, 'src', 'index.js'),
        'utf-8',
      );
      patternLearner.observeCode(code, 'index.js');

      // 3. Analyze context
      const contextAnalyzer = new ContextAnalyzer();
      contextAnalyzer.analyzeFile(
        path.join(projectDir, 'src', 'index.js'),
        code,
      );

      // 4. Create questions and answer
      const questionEngine = new QuestionEngine();
      questionEngine.recordAnswer('testing', true, {});

      const testGenerator = new TestGenerator({
        testDir: path.join(projectDir, 'tests'),
        sourceDir: path.join(projectDir, 'src'),
      });

      const testResults = testGenerator.generateForDirectory(
        path.join(projectDir, 'src'),
        true,
      );

      // 6. Generate docs
      const docGenerator = new DocGenerator({
        outputDir: path.join(projectDir, 'docs'),
        sourceDir: path.join(projectDir, 'src'),
      });

      const docResults = docGenerator.generateAll(
        path.join(projectDir, 'src'),
        true,
      );

      // Verify complete workflow
      expect(testResults.length).toBeGreaterThan(0);
      expect(docResults.modules.length).toBeGreaterThan(0);
    });
  });
});

describe('E2E: Package Validation', () => {
  test('package.json has correct structure', () => {
    const packagePath = path.join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    expect(packageJson.name).toBe('pmp-gywd');
    expect(packageJson.bin).toBeDefined();
    expect(packageJson.bin['pmp-gywd']).toBeDefined();
    expect(packageJson.scripts.test).toBeDefined();
  });

  test('all required files exist', () => {
    const rootDir = path.join(__dirname, '..', '..');

    const requiredFiles = [
      'package.json',
      'README.md',
      'LICENSE',
      'bin/install.js',
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(rootDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test('lib modules are importable', () => {
    expect(() => require('../../lib/validators')).not.toThrow();
    expect(() => require('../../lib/profile')).not.toThrow();
    expect(() => require('../../lib/questioning')).not.toThrow();
    expect(() => require('../../lib/context')).not.toThrow();
    expect(() => require('../../lib/automation')).not.toThrow();
  });
});

describe('E2E: Cross-Module Compatibility', () => {
  test('all modules use consistent error handling', () => {
    // Test that modules handle errors gracefully
    const analyzer = new DependencyAnalyzer({ rootDir: '/nonexistent' });
    const analysis = analyzer.analyze();
    expect(analysis.files).toBe(0);

    const testGen = new TestGenerator();
    const result = testGen.analyzeFile('/nonexistent/file.js');
    expect(result.error).toBeDefined();

    const contextAnalyzer = new ContextAnalyzer();
    const related = contextAnalyzer.getRelatedFiles('/nonexistent');
    expect(related).toEqual([]);
  });

  test('all modules have clear/reset functionality', () => {
    const questionEngine = new QuestionEngine();
    questionEngine.recordAnswer('q1', 'a1', {});
    questionEngine.clear();
    expect(questionEngine.getHistorySummary().totalAsked).toBe(0);

    const contextAnalyzer = new ContextAnalyzer();
    contextAnalyzer.analyzeFile('/test.js', 'const x = 1;');
    contextAnalyzer.clear();
    expect(contextAnalyzer.getSummary().filesAnalyzed).toBe(0);

    const patternLearner = new PatternLearner();
    patternLearner.observeCode('const x = 1;', 'test.js');
    patternLearner.clear();
    expect(patternLearner.observations.length).toBe(0);
  });
});
