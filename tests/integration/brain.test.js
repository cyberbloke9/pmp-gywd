/**
 * Brain Integration Tests
 *
 * Tests the integration between Profile, Questioning, and Context modules.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const { ProfileManager, PatternLearner } = require('../../lib/profile');
const { QuestionEngine, QUESTION_TYPES, PRIORITY, createQuestion } = require('../../lib/questioning');
const { ContextPredictor, ContextAnalyzer, ContextCache } = require('../../lib/context');

describe('Brain Integration', () => {
  let testDir;
  let profileManager;
  let patternLearner;
  let questionEngine;
  let contextAnalyzer;
  let contextPredictor;
  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-integration-'));

    // Initialize all brain components
    profileManager = new ProfileManager(testDir);
    patternLearner = new PatternLearner();
    questionEngine = new QuestionEngine();
    contextAnalyzer = new ContextAnalyzer();
    contextPredictor = new ContextPredictor(contextAnalyzer);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Profile + Questioning Integration', () => {
    test('question engine can use profile for adaptation', () => {
      // Initialize profile
      profileManager.init();
      profileManager.addExpertise('backend');

      const profile = profileManager.getProfile();

      // Set profile in question engine
      questionEngine.setProfile(profile);

      // Create question with expert version
      const question = createQuestion({
        id: 'arch-pattern',
        text: 'What architecture pattern?',
        type: QUESTION_TYPES.TECHNICAL,
        expertText: 'Select microservices communication pattern:',
      });

      // Adapt question to expert profile for 'backend' domain
      const adapted = questionEngine.adaptToExpertise(question, 'backend');

      expect(adapted.text).toBe('Select microservices communication pattern:');
    });

    test('profile knowledge affects question filtering', () => {
      profileManager.init();
      profileManager.recordPreference('testing_framework', 'jest', 0.95);

      // Create questions
      const questions = [
        createQuestion({
          id: 'test-framework',
          text: 'Which testing framework?',
          type: QUESTION_TYPES.TECHNICAL,
          skipIfKnown: ['testing_framework'],
        }),
        createQuestion({
          id: 'coverage-level',
          text: 'Target coverage level?',
          type: QUESTION_TYPES.TECHNICAL,
        }),
      ];

      // Import profile knowledge into question engine
      const profile = profileManager.init();
      if (profile.preferences && profile.preferences.testing_framework) {
        const pref = profile.preferences.testing_framework;
        questionEngine.recordInference('testing_framework', pref.value, pref.confidence);
      }

      // Filter questions - should skip the framework question
      const filtered = questionEngine.filterQuestions(questions);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('coverage-level');
    });

    test('pattern learner can observe and track patterns', () => {
      profileManager.init();

      // Observe code patterns
      const code1 = `const fetchUser = async (id) => { return fetch(id); };`;
      const code2 = `const processData = async (items) => { return items.map(i => i); };`;

      patternLearner.observeCode(code1, 'user.js');
      patternLearner.observeCode(code2, 'processor.js');

      // Verify patterns were observed
      expect(patternLearner.observations.length).toBe(2);

      // Record patterns to profile (recordPattern takes an object)
      profileManager.recordPattern({
        type: 'async_preference',
        description: 'Prefers async/await over callbacks',
        examples: ['async function', 'await'],
      });

      const profile = profileManager.init();
      // patterns is an array, find by type
      const asyncPattern = profile.patterns.find(p => p.type === 'async_preference');
      expect(asyncPattern).toBeDefined();
      expect(asyncPattern.description).toBe('Prefers async/await over callbacks');
    });
  });

  describe('Context + Profile Integration', () => {
    test('context cache stores and retrieves data', () => {
      const cache = new ContextCache();

      // Cache predictions
      const prediction = { files: [{ file: '/test.js', score: 0.8 }] };
      cache.cachePrediction('test-key', prediction);

      const cached = cache.getPrediction('test-key');
      expect(cached).toEqual(prediction);
    });

    test('access patterns can be exported and imported', () => {
      // Record access patterns
      contextPredictor.recordAccess('/src/a.js');
      contextPredictor.recordAccess('/src/b.js');

      // Export for persistence
      const exported = contextPredictor.export();

      expect(exported.accessPattern).toBeDefined();
      expect(exported.taskHistory).toBeDefined();

      // Import into new predictor
      const newAnalyzer = new ContextAnalyzer();
      const newPredictor = new ContextPredictor(newAnalyzer);
      newPredictor.import(exported);

      // Verify imported correctly
      const newExported = newPredictor.export();
      expect(newExported.accessPattern.accesses.length).toBe(
        exported.accessPattern.accesses.length,
      );
    });
  });

  describe('Full Brain Workflow', () => {
    test('profile -> questions -> context integration', () => {
      // Step 1: Initialize profile
      profileManager.init();
      profileManager.addLanguage('javascript');
      profileManager.addExpertise('backend');

      // Step 2: Create context-aware questions
      const questions = [
        createQuestion({
          id: 'db-choice',
          text: 'Which database?',
          type: QUESTION_TYPES.TECHNICAL,
          priority: PRIORITY.HIGH,
          tags: ['backend', 'database'],
        }),
        createQuestion({
          id: 'ui-framework',
          text: 'Which UI framework?',
          type: QUESTION_TYPES.TECHNICAL,
          priority: PRIORITY.MEDIUM,
          tags: ['frontend', 'ui'],
        }),
      ];

      // Step 3: Filter based on profile expertise
      const profile = profileManager.getSummary();
      const relevantQuestions = questions.filter(q =>
        q.tags?.some(tag => profile.expertise?.includes(tag)),
      );

      expect(relevantQuestions.length).toBe(1);
      expect(relevantQuestions[0].id).toBe('db-choice');

      // Step 4: Record answer
      questionEngine.recordAnswer('db-choice', 'postgresql', {});

      // Step 5: Record to profile
      profileManager.recordPreference('database', 'postgresql', 0.9);

      // Verify preference recorded
      const updatedProfile = profileManager.init();
      expect(updatedProfile.preferences.database.value).toBe('postgresql');
    });

    test('brain components can be cleared', () => {
      // Setup state
      profileManager.init();
      questionEngine.recordAnswer('q1', 'answer1', {});
      contextPredictor.recordAccess('/file1.js');
      patternLearner.observeCode('const x = 1;', 'test.js');

      // Clear all
      questionEngine.clear();
      contextAnalyzer.clear();
      contextPredictor.clear();
      patternLearner.clear();

      // Verify cleared
      expect(questionEngine.getHistorySummary().totalAsked).toBe(0);
      expect(contextAnalyzer.getSummary().filesAnalyzed).toBe(0);
      expect(patternLearner.observations.length).toBe(0);
    });
  });
});

describe('Brain Component Initialization', () => {
  test('all brain modules export correctly', () => {
    expect(ProfileManager).toBeDefined();
    expect(PatternLearner).toBeDefined();
    expect(QuestionEngine).toBeDefined();
    expect(QUESTION_TYPES).toBeDefined();
    expect(PRIORITY).toBeDefined();
    expect(ContextPredictor).toBeDefined();
    expect(ContextAnalyzer).toBeDefined();
    expect(ContextCache).toBeDefined();
  });

  test('brain components can be instantiated', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-test-'));

    try {
      const pm = new ProfileManager(tempDir);
      const pl = new PatternLearner();
      const qe = new QuestionEngine();
      const ca = new ContextAnalyzer();
      const cp = new ContextPredictor(ca);
      const cc = new ContextCache();

      expect(pm).toBeDefined();
      expect(pl).toBeDefined();
      expect(qe).toBeDefined();
      expect(ca).toBeDefined();
      expect(cp).toBeDefined();
      expect(cc).toBeDefined();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
