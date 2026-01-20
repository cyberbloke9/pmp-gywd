'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  FeedbackCollector,
  FEEDBACK_TYPES,
  SUGGESTION_CATEGORIES,
} = require('../../lib/memory');

describe('FeedbackCollector', () => {
  let collector;
  let testDir;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `gywd-fb-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    collector = new FeedbackCollector();

    // Mock file operations to use test directory
    collector._ensureDirectories = () => {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
    };
    collector._loadFile = (filePath, defaultValue) => {
      const testPath = path.join(testDir, path.basename(filePath));
      try {
        if (fs.existsSync(testPath)) {
          return JSON.parse(fs.readFileSync(testPath, 'utf8'));
        }
      } catch (err) {
        // Return default
      }
      return defaultValue;
    };
    collector._saveFile = (filePath, data) => {
      const testPath = path.join(testDir, path.basename(filePath));
      fs.writeFileSync(testPath, JSON.stringify(data, null, 2), 'utf8');
    };

    collector.init();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    test('initializes with empty data', () => {
      expect(collector.initialized).toBe(true);
      expect(collector.history).toEqual([]);
      expect(collector.stats.total).toBe(0);
    });

    test('init returns this for chaining', () => {
      const newCollector = new FeedbackCollector();
      newCollector._ensureDirectories = () => {};
      newCollector._loadFile = () => [];
      const result = newCollector.init();
      expect(result).toBe(newCollector);
    });
  });

  describe('recordSuggestion', () => {
    test('records a suggestion and returns ID', () => {
      const id = collector.recordSuggestion({
        category: 'pattern',
        type: 'naming',
        suggestion: 'camelCase',
      });

      expect(id).toMatch(/^sug-/);
      expect(collector.pendingSuggestions.has(id)).toBe(true);
    });

    test('stores suggestion details', () => {
      const id = collector.recordSuggestion({
        category: 'pattern',
        type: 'naming',
        suggestion: 'camelCase',
        confidence: 0.8,
        context: { file: 'test.js' },
      });

      const suggestion = collector.pendingSuggestions.get(id);
      expect(suggestion.category).toBe('pattern');
      expect(suggestion.type).toBe('naming');
      expect(suggestion.confidence).toBe(0.8);
      expect(suggestion.context.file).toBe('test.js');
    });
  });

  describe('recordFeedback', () => {
    test('records feedback for pending suggestion', () => {
      const id = collector.recordSuggestion({
        category: 'pattern',
        type: 'naming',
        suggestion: 'camelCase',
      });

      const result = collector.recordFeedback(id, FEEDBACK_TYPES.ACCEPTED);

      expect(result).toBe(true);
      expect(collector.pendingSuggestions.has(id)).toBe(false);
      expect(collector.history.length).toBe(1);
      expect(collector.history[0].feedback).toBe('accepted');
    });

    test('updates statistics on feedback', () => {
      const id = collector.recordSuggestion({
        category: 'pattern',
        type: 'naming',
        suggestion: 'camelCase',
      });

      collector.recordFeedback(id, FEEDBACK_TYPES.ACCEPTED);

      expect(collector.stats.total).toBe(1);
      expect(collector.stats.byCategory.pattern.accepted).toBe(1);
    });

    test('returns false for unknown suggestion', () => {
      const result = collector.recordFeedback('unknown-id', FEEDBACK_TYPES.ACCEPTED);
      expect(result).toBe(false);
    });

    test('records feedback details', () => {
      const id = collector.recordSuggestion({
        category: 'code',
        type: 'refactor',
        suggestion: 'Extract function',
      });

      collector.recordFeedback(id, FEEDBACK_TYPES.MODIFIED, {
        modification: 'Changed name',
      });

      expect(collector.history[0].feedbackDetails.modification).toBe('Changed name');
    });
  });

  describe('recordQuickFeedback', () => {
    test('records feedback without prior suggestion', () => {
      const id = collector.recordQuickFeedback({
        category: 'pattern',
        type: 'async',
        suggestion: 'async/await',
        feedback: FEEDBACK_TYPES.ACCEPTED,
      });

      expect(id).toMatch(/^fb-/);
      expect(collector.history.length).toBe(1);
      expect(collector.stats.total).toBe(1);
    });
  });

  describe('getAcceptanceRate', () => {
    beforeEach(() => {
      // Record some feedback
      for (let i = 0; i < 7; i++) {
        collector.recordQuickFeedback({
          category: 'pattern',
          type: 'naming',
          feedback: FEEDBACK_TYPES.ACCEPTED,
        });
      }
      for (let i = 0; i < 3; i++) {
        collector.recordQuickFeedback({
          category: 'pattern',
          type: 'naming',
          feedback: FEEDBACK_TYPES.REJECTED,
        });
      }
    });

    test('calculates category acceptance rate', () => {
      const rate = collector.getAcceptanceRate('pattern');
      expect(rate).toBe(0.7); // 7/10
    });

    test('returns default for unknown category', () => {
      const rate = collector.getAcceptanceRate('unknown');
      expect(rate).toBe(0.5);
    });
  });

  describe('getTypeAcceptanceRate', () => {
    beforeEach(() => {
      for (let i = 0; i < 8; i++) {
        collector.recordQuickFeedback({
          category: 'pattern',
          type: 'naming',
          feedback: FEEDBACK_TYPES.ACCEPTED,
        });
      }
      for (let i = 0; i < 2; i++) {
        collector.recordQuickFeedback({
          category: 'pattern',
          type: 'naming',
          feedback: FEEDBACK_TYPES.REJECTED,
        });
      }
    });

    test('calculates type acceptance rate', () => {
      const rate = collector.getTypeAcceptanceRate('pattern', 'naming');
      expect(rate).toBe(0.8); // 8/10
    });

    test('returns default for unknown type', () => {
      const rate = collector.getTypeAcceptanceRate('pattern', 'unknown');
      expect(rate).toBe(0.5);
    });
  });

  describe('getHistory', () => {
    beforeEach(() => {
      collector.recordQuickFeedback({
        category: 'pattern',
        type: 'naming',
        feedback: FEEDBACK_TYPES.ACCEPTED,
      });
      collector.recordQuickFeedback({
        category: 'code',
        type: 'refactor',
        feedback: FEEDBACK_TYPES.REJECTED,
      });
    });

    test('returns all history without filter', () => {
      const history = collector.getHistory();
      expect(history.length).toBe(2);
    });

    test('filters by category', () => {
      const history = collector.getHistory('pattern');
      expect(history.length).toBe(1);
      expect(history[0].category).toBe('pattern');
    });

    test('respects limit', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordQuickFeedback({
          category: 'test',
          type: 'test',
          feedback: FEEDBACK_TYPES.ACCEPTED,
        });
      }
      const history = collector.getHistory(null, 5);
      expect(history.length).toBe(5);
    });
  });

  describe('getPendingSuggestions', () => {
    test('returns pending suggestions', () => {
      collector.recordSuggestion({ category: 'a', suggestion: '1' });
      collector.recordSuggestion({ category: 'b', suggestion: '2' });

      const pending = collector.getPendingSuggestions();
      expect(pending.length).toBe(2);
    });
  });

  describe('getLowPerformingTypes', () => {
    beforeEach(() => {
      // Low performing type (20% acceptance)
      for (let i = 0; i < 1; i++) {
        collector.recordQuickFeedback({
          category: 'pattern',
          type: 'bad',
          feedback: FEEDBACK_TYPES.ACCEPTED,
        });
      }
      for (let i = 0; i < 4; i++) {
        collector.recordQuickFeedback({
          category: 'pattern',
          type: 'bad',
          feedback: FEEDBACK_TYPES.REJECTED,
        });
      }

      // High performing type
      for (let i = 0; i < 5; i++) {
        collector.recordQuickFeedback({
          category: 'pattern',
          type: 'good',
          feedback: FEEDBACK_TYPES.ACCEPTED,
        });
      }
    });

    test('identifies low performing types', () => {
      const low = collector.getLowPerformingTypes(0.3);
      expect(low.length).toBe(1);
      expect(low[0].type).toBe('bad');
      expect(low[0].acceptanceRate).toBe(0.2);
    });
  });

  describe('getHighPerformingTypes', () => {
    beforeEach(() => {
      // High performing type (90% acceptance)
      for (let i = 0; i < 9; i++) {
        collector.recordQuickFeedback({
          category: 'pattern',
          type: 'great',
          feedback: FEEDBACK_TYPES.ACCEPTED,
        });
      }
      collector.recordQuickFeedback({
        category: 'pattern',
        type: 'great',
        feedback: FEEDBACK_TYPES.REJECTED,
      });
    });

    test('identifies high performing types', () => {
      const high = collector.getHighPerformingTypes(0.7);
      expect(high.length).toBe(1);
      expect(high[0].type).toBe('great');
      expect(high[0].acceptanceRate).toBe(0.9);
    });
  });

  describe('adjustConfidence', () => {
    beforeEach(() => {
      // 80% acceptance rate for pattern:naming
      for (let i = 0; i < 8; i++) {
        collector.recordQuickFeedback({
          category: 'pattern',
          type: 'naming',
          feedback: FEEDBACK_TYPES.ACCEPTED,
        });
      }
      for (let i = 0; i < 2; i++) {
        collector.recordQuickFeedback({
          category: 'pattern',
          type: 'naming',
          feedback: FEEDBACK_TYPES.REJECTED,
        });
      }
    });

    test('adjusts confidence based on history', () => {
      const adjusted = collector.adjustConfidence('pattern', 'naming', 0.5);
      // 0.5 * 0.6 + 0.8 * 0.25 + 0.8 * 0.15 = 0.3 + 0.2 + 0.12 = 0.62
      expect(adjusted).toBeCloseTo(0.62, 1);
    });

    test('caps confidence at bounds', () => {
      const high = collector.adjustConfidence('pattern', 'naming', 1.0);
      expect(high).toBeLessThanOrEqual(0.99);

      const low = collector.adjustConfidence('unknown', 'unknown', 0.0);
      expect(low).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('shouldSuppress', () => {
    test('returns true for very low acceptance', () => {
      // 10% acceptance (1/10)
      for (let i = 0; i < 1; i++) {
        collector.recordQuickFeedback({
          category: 'bad',
          type: 'type',
          feedback: FEEDBACK_TYPES.ACCEPTED,
        });
      }
      for (let i = 0; i < 9; i++) {
        collector.recordQuickFeedback({
          category: 'bad',
          type: 'type',
          feedback: FEEDBACK_TYPES.REJECTED,
        });
      }

      expect(collector.shouldSuppress('bad', 'type')).toBe(true);
    });

    test('returns false for insufficient data', () => {
      collector.recordQuickFeedback({
        category: 'new',
        type: 'type',
        feedback: FEEDBACK_TYPES.REJECTED,
      });

      expect(collector.shouldSuppress('new', 'type')).toBe(false);
    });
  });

  describe('utilities', () => {
    test('getStats returns statistics', () => {
      collector.recordQuickFeedback({
        category: 'pattern',
        type: 'test',
        feedback: FEEDBACK_TYPES.ACCEPTED,
      });

      const stats = collector.getStats();
      expect(stats.total).toBe(1);
      expect(stats.historySize).toBe(1);
      expect(stats.categoriesTracked).toBe(1);
    });

    test('clear removes all data', () => {
      collector.recordQuickFeedback({
        category: 'test',
        type: 'test',
        feedback: FEEDBACK_TYPES.ACCEPTED,
      });

      collector.clear();

      expect(collector.history.length).toBe(0);
      expect(collector.stats.total).toBe(0);
    });

    test('export returns data', () => {
      collector.recordQuickFeedback({
        category: 'test',
        type: 'test',
        feedback: FEEDBACK_TYPES.ACCEPTED,
      });

      const exported = collector.export();
      expect(exported.version).toBe('1.0.0');
      expect(exported.history.length).toBe(1);
    });

    test('import merges data', () => {
      collector.recordQuickFeedback({
        category: 'existing',
        type: 'type',
        feedback: FEEDBACK_TYPES.ACCEPTED,
      });

      const newData = {
        history: [{
          id: 'new-id',
          category: 'imported',
          type: 'type',
          feedback: FEEDBACK_TYPES.ACCEPTED,
        }],
      };

      collector.import(newData, true);

      expect(collector.history.length).toBe(2);
    });

    test('import replaces when merge=false', () => {
      collector.recordQuickFeedback({
        category: 'old',
        type: 'type',
        feedback: FEEDBACK_TYPES.ACCEPTED,
      });

      const newData = {
        history: [{
          id: 'new-id',
          category: 'new',
          type: 'type',
          feedback: FEEDBACK_TYPES.ACCEPTED,
        }],
        stats: { total: 1, byCategory: {}, byType: {}, acceptanceRate: 1 },
      };

      collector.import(newData, false);

      expect(collector.history.length).toBe(1);
      expect(collector.history[0].category).toBe('new');
    });

    test('getFeedbackDir returns path', () => {
      const dir = FeedbackCollector.getFeedbackDir();
      expect(dir).toContain('.gywd');
      expect(dir).toContain('feedback');
    });
  });

  describe('constants', () => {
    test('FEEDBACK_TYPES has expected values', () => {
      expect(FEEDBACK_TYPES.ACCEPTED).toBe('accepted');
      expect(FEEDBACK_TYPES.REJECTED).toBe('rejected');
      expect(FEEDBACK_TYPES.MODIFIED).toBe('modified');
      expect(FEEDBACK_TYPES.IGNORED).toBe('ignored');
    });

    test('SUGGESTION_CATEGORIES has expected values', () => {
      expect(SUGGESTION_CATEGORIES.PATTERN).toBe('pattern');
      expect(SUGGESTION_CATEGORIES.CODE).toBe('code');
      expect(SUGGESTION_CATEGORIES.QUESTION).toBe('question');
    });
  });
});
