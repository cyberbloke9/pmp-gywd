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

  describe('global memory sync', () => {
    let globalManager;
    let globalTestDir;

    beforeEach(() => {
      globalTestDir = path.join(tempDir, 'global-test');
      fs.mkdirSync(globalTestDir, { recursive: true });
      globalManager = new ProfileManager(globalTestDir, { enableGlobalSync: true });

      // Mock the global memory to use test directory
      if (globalManager.globalMemory) {
        const mockDir = path.join(tempDir, 'mock-global');
        fs.mkdirSync(mockDir, { recursive: true });
        globalManager.globalMemory._batchWindowMs = 0; // Synchronous writes for tests
        globalManager.globalMemory._ensureDirectories = () => {
          if (!fs.existsSync(mockDir)) {
            fs.mkdirSync(mockDir, { recursive: true });
          }
        };
        globalManager.globalMemory._loadFile = (filePath, defaultValue) => {
          const testPath = path.join(mockDir, path.basename(filePath));
          try {
            if (fs.existsSync(testPath)) {
              return JSON.parse(fs.readFileSync(testPath, 'utf8'));
            }
          } catch (err) {
            // Return default
          }
          return defaultValue;
        };
        globalManager.globalMemory._saveFile = (filePath, data) => {
          const testPath = path.join(mockDir, path.basename(filePath));
          fs.writeFileSync(testPath, JSON.stringify(data, null, 2), 'utf8');
        };
      }
    });

    test('constructor enables global sync with options', () => {
      expect(globalManager.enableGlobalSync).toBe(true);
      expect(globalManager.globalMemory).not.toBeNull();
    });

    test('constructor without global sync option', () => {
      const localManager = new ProfileManager(tempDir);
      expect(localManager.enableGlobalSync).toBe(false);
      expect(localManager.globalMemory).toBeNull();
    });

    test('enableGlobal enables sync after construction', () => {
      const localManager = new ProfileManager(tempDir);
      expect(localManager.enableGlobalSync).toBe(false);

      localManager.enableGlobal(true);
      expect(localManager.enableGlobalSync).toBe(true);
      expect(localManager.autoSync).toBe(true);
      expect(localManager.globalMemory).not.toBeNull();
    });

    test('disableGlobal disables sync', () => {
      globalManager.disableGlobal();
      expect(globalManager.enableGlobalSync).toBe(false);
      expect(globalManager.autoSync).toBe(false);
    });

    test('syncToGlobal pushes patterns to global memory', () => {
      globalManager.init();
      globalManager.addLanguage('javascript');
      globalManager.addExpertise('backend');
      globalManager.recordPattern({
        type: 'naming',
        description: 'camelCase',
      });

      globalManager.syncToGlobal();

      const stats = globalManager.getGlobalStats();
      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(stats.expertiseAreas).toBeGreaterThan(0);
    });

    test('syncFromGlobal pulls hints from global memory', () => {
      // First, populate global memory
      globalManager.init();
      globalManager.globalMemory.init();
      globalManager.globalMemory.recordPattern({
        type: 'async',
        pattern: 'async_await',
        confidence: 0.9,
      });
      globalManager.globalMemory.addExpertise('frontend', 0.8);

      // Now sync from global
      const enhanced = globalManager.syncFromGlobal();

      expect(enhanced.globalPatterns).toBeDefined();
      expect(enhanced.globalExpertise).toBeDefined();
    });

    test('getGlobalMemory returns instance', () => {
      const memory = globalManager.getGlobalMemory();
      expect(memory).not.toBeNull();
    });

    test('getGlobalMemory returns null when disabled', () => {
      const localManager = new ProfileManager(tempDir);
      expect(localManager.getGlobalMemory()).toBeNull();
    });

    test('getGlobalStats returns stats when enabled', () => {
      globalManager.init();
      const stats = globalManager.getGlobalStats();
      expect(stats).not.toBeNull();
      expect(stats.totalPatterns).toBeDefined();
    });

    test('getGlobalStats returns null when disabled', () => {
      const localManager = new ProfileManager(tempDir);
      expect(localManager.getGlobalStats()).toBeNull();
    });

    test('syncToGlobal does nothing when disabled', () => {
      const localManager = new ProfileManager(tempDir);
      localManager.init();
      // Should not throw
      localManager.syncToGlobal();
    });

    test('syncFromGlobal returns profile when disabled', () => {
      const localManager = new ProfileManager(tempDir);
      localManager.init();
      const result = localManager.syncFromGlobal();
      expect(result).toBe(localManager.profile);
    });
  });
});
