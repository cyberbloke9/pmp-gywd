'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  GlobalMemory,
  PatternAggregator,
  FeedbackCollector,
  ConfidenceCalibrator,
  TeamSync,
} = require('../../lib/memory');

describe('Memory Module Integration', () => {
  let testDir;
  let mockStorage;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `gywd-mem-int-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Shared mock storage for all components
    mockStorage = {
      global: { patterns: [], expertise: {}, preferences: {}, projects: [] },
      feedback: { history: [], stats: { total: 0, byCategory: {}, byType: {}, acceptanceRate: 0 } },
      calibration: { calibrationData: {}, predictionHistory: [] },
    };
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to create mocked GlobalMemory
   */
  function createMockedGlobalMemory() {
    const memory = new GlobalMemory();
    memory._ensureDirectories = () => {};
    memory._loadFile = (filePath, defaultValue) => {
      const name = path.basename(filePath, '.json');
      if (name === 'patterns') return mockStorage.global.patterns;
      if (name === 'expertise') return mockStorage.global.expertise;
      if (name === 'preferences') return mockStorage.global.preferences;
      if (name === 'projects') return mockStorage.global.projects;
      return defaultValue;
    };
    memory._saveFile = (filePath, data) => {
      const name = path.basename(filePath, '.json');
      if (name === 'patterns') mockStorage.global.patterns = data;
      if (name === 'expertise') mockStorage.global.expertise = data;
      if (name === 'preferences') mockStorage.global.preferences = data;
      if (name === 'projects') mockStorage.global.projects = data;
    };
    memory.init();
    return memory;
  }

  /**
   * Helper to create mocked FeedbackCollector
   */
  function createMockedFeedbackCollector() {
    const collector = new FeedbackCollector();
    collector._ensureDirectories = () => {};
    collector._loadFile = (filePath, defaultValue) => {
      const name = path.basename(filePath, '.json');
      if (name === 'history') return mockStorage.feedback.history;
      if (name === 'stats') return mockStorage.feedback.stats;
      return defaultValue;
    };
    collector._saveFile = (filePath, data) => {
      const name = path.basename(filePath, '.json');
      if (name === 'history') mockStorage.feedback.history = data;
      if (name === 'stats') mockStorage.feedback.stats = data;
    };
    collector.init();
    return collector;
  }

  /**
   * Helper to create mocked ConfidenceCalibrator
   */
  function createMockedCalibrator() {
    const calibrator = new ConfidenceCalibrator();
    calibrator._ensureDirectories = () => {};
    const _dataFile = path.join(testDir, 'calibration.json');
    calibrator._loadData = () => {
      calibrator.calibrationData = mockStorage.calibration.calibrationData;
      calibrator.predictionHistory = mockStorage.calibration.predictionHistory;
    };
    calibrator.save = () => {
      mockStorage.calibration.calibrationData = calibrator.calibrationData;
      mockStorage.calibration.predictionHistory = calibrator.predictionHistory;
    };
    calibrator.init();
    return calibrator;
  }

  describe('GlobalMemory + PatternAggregator', () => {
    test('aggregator uses global memory patterns', () => {
      const memory = createMockedGlobalMemory();

      // Add patterns from multiple projects
      memory.registerProject('/project-a', { name: 'project-a' });
      memory.registerProject('/project-b', { name: 'project-b' });

      memory.recordPattern({ type: 'naming', pattern: 'camelCase', confidence: 0.8, source: 'project-a' });
      memory.recordPattern({ type: 'naming', pattern: 'camelCase', confidence: 0.9, source: 'project-b' });
      memory.recordPattern({ type: 'async', pattern: 'promises', confidence: 0.7, source: 'project-a' });

      // Create aggregator with same memory
      const aggregator = new PatternAggregator(memory);
      aggregator.init();

      // Verify aggregation
      const consensus = aggregator.getConsensusPatterns('moderate');
      expect(consensus.length).toBeGreaterThan(0);

      const dominant = aggregator.getDominantPattern('naming');
      expect(dominant.pattern).toBe('camelCase');
    });

    test('aggregator recommendations reflect global patterns', () => {
      const memory = createMockedGlobalMemory();

      memory.registerProject('/p1', { name: 'p1' });
      memory.registerProject('/p2', { name: 'p2' });

      memory.recordPattern({ type: 'structure', pattern: 'functional', confidence: 0.9, source: 'p1' });
      memory.recordPattern({ type: 'structure', pattern: 'functional', confidence: 0.85, source: 'p2' });

      const aggregator = new PatternAggregator(memory);
      const recs = aggregator.getRecommendations();

      expect(recs.structure).toBeDefined();
      expect(recs.structure.recommended).toBe('functional');
    });
  });

  describe('FeedbackCollector + ConfidenceCalibrator', () => {
    test('calibrator adjusts confidence based on feedback', () => {
      const collector = createMockedFeedbackCollector();
      const calibrator = createMockedCalibrator();

      // Record feedback about pattern suggestions
      for (let i = 0; i < 8; i++) {
        collector.recordQuickFeedback({
          category: 'pattern',
          type: 'naming',
          feedback: 'accepted',
        });
        calibrator.recordOutcome('pattern:naming', true);
      }
      for (let i = 0; i < 2; i++) {
        collector.recordQuickFeedback({
          category: 'pattern',
          type: 'naming',
          feedback: 'rejected',
        });
        calibrator.recordOutcome('pattern:naming', false);
      }

      // Verify feedback stats
      const fbRate = collector.getAcceptanceRate('pattern');
      expect(fbRate).toBeCloseTo(0.8, 1);

      // Verify calibrated confidence
      const calibrated = calibrator.getCalibratedConfidence('pattern:naming', 0.5);
      expect(calibrated).toBeGreaterThan(0.5); // Should be pulled toward observed 80%
    });

    test('low acceptance rate suggests suppression', () => {
      const collector = createMockedFeedbackCollector();

      // Record mostly rejections (1 accepted, 9 rejected = 10% acceptance)
      collector.recordQuickFeedback({
        category: 'bad',
        type: 'suggestion',
        feedback: 'accepted',
      });
      for (let i = 0; i < 9; i++) {
        collector.recordQuickFeedback({
          category: 'bad',
          type: 'suggestion',
          feedback: 'rejected',
        });
      }

      const shouldSuppress = collector.shouldSuppress('bad', 'suggestion');
      expect(shouldSuppress).toBe(true);
    });
  });

  describe('GlobalMemory + TeamSync', () => {
    test('team sync exports and imports patterns', () => {
      const memory = createMockedGlobalMemory();
      const sync = new TeamSync(memory);

      // Add local patterns
      memory.recordPattern({ type: 'test', pattern: 'jest', confidence: 0.9 });
      memory.addExpertise('testing', 0.8);
      memory.setPreference('coverage', 80);

      // Export
      const exported = sync.exportForTeam('dev-team');
      expect(exported.patterns.length).toBe(1);
      expect(exported.expertise).toBeDefined();
      expect(exported.preferences.coverage).toBe(80);

      // Create new memory and sync
      const memory2Storage = { patterns: [], expertise: {}, preferences: {}, projects: [] };
      const memory2 = new GlobalMemory();
      memory2._ensureDirectories = () => {};
      memory2._loadFile = (filePath, defaultValue) => {
        const name = path.basename(filePath, '.json');
        return memory2Storage[name] || defaultValue;
      };
      memory2._saveFile = (filePath, data) => {
        const name = path.basename(filePath, '.json');
        memory2Storage[name] = data;
      };
      memory2.init();

      const sync2 = new TeamSync(memory2);
      const result = sync2.importFromTeam(exported);

      expect(result.success).toBe(true);
      expect(result.summary.patternsImported).toBe(1);
    });

    test('team merge combines multiple exports', () => {
      const memory = createMockedGlobalMemory();
      const sync = new TeamSync(memory);

      const team1 = {
        teamName: 'frontend',
        patterns: [{ type: 'ui', pattern: 'react', confidence: 0.9 }],
        expertise: { frontend: { level: 0.9 } },
      };

      const team2 = {
        teamName: 'backend',
        patterns: [
          { type: 'ui', pattern: 'react', confidence: 0.8 },
          { type: 'api', pattern: 'rest', confidence: 0.85 },
        ],
        expertise: { backend: { level: 0.9 } },
      };

      const merged = sync.mergeTeamExports([team1, team2]);

      expect(merged.sourceTeams).toContain('frontend');
      expect(merged.sourceTeams).toContain('backend');
      expect(merged.patterns.length).toBe(2); // react + rest
      expect(merged.stats.crossTeamPatterns).toBe(1); // react in both
    });
  });

  describe('Full Learning Pipeline', () => {
    test('pattern learning → feedback → calibration → recommendation', () => {
      const memory = createMockedGlobalMemory();
      const collector = createMockedFeedbackCollector();
      const calibrator = createMockedCalibrator();
      const aggregator = new PatternAggregator(memory);
      const sync = new TeamSync(memory);

      // Step 1: Learn patterns from projects
      memory.registerProject('/app', { name: 'app' });
      memory.recordPattern({ type: 'code', pattern: 'typescript', confidence: 0.8, source: 'app' });
      memory.addExpertise('typescript', 0.7);

      // Step 2: Make suggestion and collect feedback
      const suggestionId = collector.recordSuggestion({
        category: 'code',
        type: 'typescript',
        suggestion: 'Use strict mode',
        confidence: 0.8,
      });
      collector.recordFeedback(suggestionId, 'accepted');
      calibrator.recordOutcome('code:typescript', true, 0.8);

      // Step 3: Get calibrated confidence for future suggestions
      const calibratedConf = calibrator.getCalibratedConfidence('code:typescript', 0.7);
      expect(calibratedConf).toBeGreaterThan(0);

      // Step 4: Get aggregated recommendations
      const _recs = aggregator.getRecommendations();
      // May or may not have recommendation depending on confidence threshold

      // Step 5: Export for team
      const teamExport = sync.exportForTeam('my-team', { minConfidence: 0.5 });
      expect(teamExport.patterns.length).toBe(1);
      expect(teamExport.expertise).toBeDefined();
    });
  });

  describe('Cross-Module Data Flow', () => {
    test('patterns flow from global memory through all modules', () => {
      const memory = createMockedGlobalMemory();

      // Create all modules sharing the same memory
      const aggregator = new PatternAggregator(memory);
      const sync = new TeamSync(memory);

      // Add data via GlobalMemory
      memory.registerProject('/shared', { name: 'shared' });
      memory.recordPattern({ type: 'shared', pattern: 'value', confidence: 0.75, source: 'shared' });

      // Verify PatternAggregator sees it
      aggregator.init();
      const patterns = aggregator.getPatternsByType('shared');
      expect(patterns.length).toBe(1);

      // Verify TeamSync can export it
      const exported = sync.exportForTeam('test', { minConfidence: 0.5 });
      expect(exported.patterns.some(p => p.type === 'shared')).toBe(true);
    });
  });
});
