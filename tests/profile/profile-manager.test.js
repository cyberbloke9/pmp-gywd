/**
 * Profile Manager Tests
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { ProfileManager } = require('../../lib/profile');

describe('ProfileManager', () => {
  let tempDir;
  let manager;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `gywd-profile-test-${Date.now()}`);
    manager = new ProfileManager(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('init', () => {
    test('creates new profile if none exists', () => {
      const profile = manager.init();

      expect(profile).toBeDefined();
      expect(profile.version).toBe('3.0.0');
      expect(profile.created).toBeDefined();
      expect(fs.existsSync(manager.profilePath)).toBe(true);
    });

    test('loads existing profile', () => {
      // Create initial profile
      manager.init();
      manager.addLanguage('JavaScript');
      manager.save();

      // Create new manager and load
      const manager2 = new ProfileManager(tempDir);
      const profile = manager2.init();

      expect(profile.tooling.primaryLanguages).toContain('JavaScript');
    });

    test('creates profile directory if missing', () => {
      const nestedDir = path.join(tempDir, 'nested', 'path');
      const nestedManager = new ProfileManager(nestedDir);

      nestedManager.init();
      expect(fs.existsSync(nestedDir)).toBe(true);
    });
  });

  describe('updateSection', () => {
    test('updates cognitive section', () => {
      manager.init();
      manager.updateSection('cognitive', {
        problemApproach: 'top-down',
        debuggingStyle: 'systematic',
      });

      const profile = manager.getProfile();
      expect(profile.cognitive.problemApproach).toBe('top-down');
      expect(profile.cognitive.debuggingStyle).toBe('systematic');
    });

    test('updates communication section', () => {
      manager.init();
      manager.updateSection('communication', {
        verbosity: 'detailed',
      });

      const profile = manager.getProfile();
      expect(profile.communication.verbosity).toBe('detailed');
    });

    test('preserves existing values', () => {
      manager.init();
      manager.updateSection('cognitive', { problemApproach: 'bottom-up' });
      manager.updateSection('cognitive', { debuggingStyle: 'intuitive' });

      const profile = manager.getProfile();
      expect(profile.cognitive.problemApproach).toBe('bottom-up');
      expect(profile.cognitive.debuggingStyle).toBe('intuitive');
    });
  });

  describe('recordPreference', () => {
    test('records a preference with confidence', () => {
      manager.init();
      manager.recordPreference('editor.tabSize', 2, 0.9);

      const profile = manager.getProfile();
      expect(profile.preferences['editor.tabSize']).toBeDefined();
      expect(profile.preferences['editor.tabSize'].value).toBe(2);
      expect(profile.preferences['editor.tabSize'].confidence).toBe(0.9);
    });

    test('uses default confidence', () => {
      manager.init();
      manager.recordPreference('style.semicolons', true);

      const profile = manager.getProfile();
      expect(profile.preferences['style.semicolons'].confidence).toBe(0.5);
    });
  });

  describe('recordPattern', () => {
    test('records a pattern', () => {
      manager.init();
      manager.recordPattern({
        type: 'naming',
        description: 'Uses camelCase for functions',
        examples: ['getUserName', 'fetchData'],
      });

      const profile = manager.getProfile();
      expect(profile.patterns).toHaveLength(1);
      expect(profile.patterns[0].type).toBe('naming');
      expect(profile.patterns[0].id).toMatch(/^pattern-/);
      expect(profile.interactions.patternsLearned).toBe(1);
    });
  });

  describe('recordInteraction', () => {
    test('increments session count', () => {
      manager.init();
      manager.recordInteraction('session');
      manager.recordInteraction('session');

      expect(manager.getProfile().interactions.totalSessions).toBe(2);
    });

    test('increments question count', () => {
      manager.init();
      manager.recordInteraction('question');

      expect(manager.getProfile().interactions.questionsAsked).toBe(1);
    });

    test('increments decision count', () => {
      manager.init();
      manager.recordInteraction('decision');

      expect(manager.getProfile().interactions.decisionsRecorded).toBe(1);
    });
  });

  describe('addLanguage', () => {
    test('adds new language', () => {
      manager.init();
      manager.addLanguage('TypeScript');
      manager.addLanguage('Python');

      const langs = manager.getProfile().tooling.primaryLanguages;
      expect(langs).toContain('TypeScript');
      expect(langs).toContain('Python');
    });

    test('does not duplicate languages', () => {
      manager.init();
      manager.addLanguage('JavaScript');
      manager.addLanguage('JavaScript');

      const langs = manager.getProfile().tooling.primaryLanguages;
      expect(langs.filter(l => l === 'JavaScript')).toHaveLength(1);
    });
  });

  describe('addExpertise', () => {
    test('adds expertise area', () => {
      manager.init();
      manager.addExpertise('API Design');
      manager.addExpertise('Testing');

      const areas = manager.getProfile().domain.expertiseAreas;
      expect(areas).toContain('API Design');
      expect(areas).toContain('Testing');
    });
  });

  describe('getSummary', () => {
    test('returns profile summary', () => {
      manager.init();
      manager.addLanguage('JavaScript');
      manager.recordPattern({ type: 'test' });

      const summary = manager.getSummary();
      expect(summary.languages).toContain('JavaScript');
      expect(summary.patternsCount).toBe(1);
      expect(summary.cognitive).toBeDefined();
      expect(summary.communication).toBeDefined();
    });

    test('returns null if no profile', () => {
      expect(manager.getSummary()).toBeNull();
    });
  });

  describe('mergeWithDefaults', () => {
    test('adds missing fields from defaults', () => {
      manager.init();

      // Simulate loading old profile missing new fields
      const oldProfile = {
        version: '2.0.0',
        cognitive: { problemApproach: 'top-down' },
      };

      const merged = manager.mergeWithDefaults(oldProfile);

      expect(merged.cognitive.problemApproach).toBe('top-down');
      expect(merged.cognitive.debuggingStyle).toBe('unknown');
      expect(merged.communication).toBeDefined();
      expect(merged.tooling).toBeDefined();
    });
  });
});
