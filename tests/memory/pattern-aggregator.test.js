'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { GlobalMemory, PatternAggregator, CONSENSUS_THRESHOLDS } = require('../../lib/memory');

describe('PatternAggregator', () => {
  let globalMemory;
  let aggregator;
  let testDir;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `gywd-agg-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Create mock global memory
    globalMemory = new GlobalMemory();
    globalMemory._batchWindowMs = 0; // Synchronous writes for tests
    globalMemory._ensureDirectories = () => {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
    };
    globalMemory._loadFile = (filePath, defaultValue) => {
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
    globalMemory._saveFile = (filePath, data) => {
      const testPath = path.join(testDir, path.basename(filePath));
      fs.writeFileSync(testPath, JSON.stringify(data, null, 2), 'utf8');
    };

    globalMemory.init();
    aggregator = new PatternAggregator(globalMemory);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    test('initializes with empty patterns', () => {
      aggregator.init();
      expect(aggregator.initialized).toBe(true);
      expect(aggregator.aggregatedPatterns.size).toBe(0);
    });

    test('init returns this for chaining', () => {
      const result = aggregator.init();
      expect(result).toBe(aggregator);
    });

    test('creates GlobalMemory if not provided', () => {
      const newAgg = new PatternAggregator();
      expect(newAgg.globalMemory).toBeDefined();
    });
  });

  describe('pattern aggregation', () => {
    beforeEach(() => {
      // Set up test data - patterns from multiple projects
      globalMemory.registerProject('/project-a', { name: 'project-a' });
      globalMemory.registerProject('/project-b', { name: 'project-b' });
      globalMemory.registerProject('/project-c', { name: 'project-c' });

      // Pattern used in all projects (strong consensus)
      globalMemory.recordPattern({
        type: 'naming',
        pattern: 'camelCase',
        confidence: 0.8,
        source: 'project-a',
      });
      globalMemory.recordPattern({
        type: 'naming',
        pattern: 'camelCase',
        confidence: 0.9,
        source: 'project-b',
      });
      globalMemory.recordPattern({
        type: 'naming',
        pattern: 'camelCase',
        confidence: 0.85,
        source: 'project-c',
      });

      // Pattern in two projects (moderate consensus)
      globalMemory.recordPattern({
        type: 'async',
        pattern: 'async_await',
        confidence: 0.7,
        source: 'project-a',
      });
      globalMemory.recordPattern({
        type: 'async',
        pattern: 'async_await',
        confidence: 0.75,
        source: 'project-b',
      });

      // Outlier pattern (only in one project)
      globalMemory.recordPattern({
        type: 'structure',
        pattern: 'functional',
        confidence: 0.6,
        source: 'project-c',
      });

      aggregator.init();
    });

    test('aggregates patterns by type and pattern', () => {
      expect(aggregator.aggregatedPatterns.size).toBe(3);
    });

    test('calculates consensus level correctly', () => {
      const naming = aggregator.getDominantPattern('naming');
      expect(naming.consensusLevel).toBe('strong');

      const async = aggregator.getDominantPattern('async');
      expect(async.consensusLevel).toBe('moderate');

      const structure = aggregator.getDominantPattern('structure');
      expect(structure.consensusLevel).toBe('weak');
    });

    test('identifies outlier patterns', () => {
      const outliers = aggregator.getOutlierPatterns();
      expect(outliers.length).toBe(1);
      expect(outliers[0].pattern).toBe('functional');
    });

    test('tracks project count correctly', () => {
      const naming = aggregator.getDominantPattern('naming');
      expect(naming.projectCount).toBe(3);

      const async = aggregator.getDominantPattern('async');
      expect(async.projectCount).toBe(2);
    });
  });

  describe('consensus patterns', () => {
    beforeEach(() => {
      globalMemory.registerProject('/p1', { name: 'p1' });
      globalMemory.registerProject('/p2', { name: 'p2' });
      globalMemory.registerProject('/p3', { name: 'p3' });
      globalMemory.registerProject('/p4', { name: 'p4' });

      // Strong consensus (4/4 = 100%)
      for (const p of ['p1', 'p2', 'p3', 'p4']) {
        globalMemory.recordPattern({
          type: 'strong',
          pattern: 'value',
          confidence: 0.8,
          source: p,
        });
      }

      // Moderate consensus (2/4 = 50%)
      for (const p of ['p1', 'p2']) {
        globalMemory.recordPattern({
          type: 'moderate',
          pattern: 'value',
          confidence: 0.7,
          source: p,
        });
      }

      // Weak consensus (1/4 = 25%)
      globalMemory.recordPattern({
        type: 'weak',
        pattern: 'value',
        confidence: 0.6,
        source: 'p1',
      });

      aggregator.init();
    });

    test('getConsensusPatterns with strong level', () => {
      const strong = aggregator.getConsensusPatterns('strong');
      expect(strong.length).toBe(1);
      expect(strong[0].type).toBe('strong');
    });

    test('getConsensusPatterns with moderate level', () => {
      const moderate = aggregator.getConsensusPatterns('moderate');
      expect(moderate.length).toBe(2);
    });

    test('getConsensusPatterns defaults to moderate', () => {
      const defaults = aggregator.getConsensusPatterns();
      expect(defaults.length).toBe(2);
    });
  });

  describe('project-specific queries', () => {
    beforeEach(() => {
      globalMemory.registerProject('/alpha', { name: 'alpha' });
      globalMemory.registerProject('/beta', { name: 'beta' });

      globalMemory.recordPattern({
        type: 'shared',
        pattern: 'both',
        source: 'alpha',
      });
      globalMemory.recordPattern({
        type: 'shared',
        pattern: 'both',
        source: 'beta',
      });

      globalMemory.recordPattern({
        type: 'unique',
        pattern: 'alpha-only',
        source: 'alpha',
      });

      globalMemory.recordPattern({
        type: 'unique',
        pattern: 'beta-only',
        source: 'beta',
      });

      aggregator.init();
    });

    test('getUniquePatterns returns project-specific patterns', () => {
      const alphaUnique = aggregator.getUniquePatterns('alpha');
      expect(alphaUnique.length).toBe(1);
      expect(alphaUnique[0].pattern).toBe('alpha-only');
    });

    test('getCommonPatterns returns shared patterns', () => {
      const common = aggregator.getCommonPatterns(['alpha', 'beta']);
      expect(common.length).toBe(1);
      expect(common[0].pattern).toBe('both');
    });

    test('getCommonPatterns returns empty for unknown projects', () => {
      const common = aggregator.getCommonPatterns(['unknown']);
      expect(common).toEqual([]);
    });
  });

  describe('pattern type queries', () => {
    beforeEach(() => {
      globalMemory.registerProject('/p', { name: 'p' });

      globalMemory.recordPattern({
        type: 'naming',
        pattern: 'camelCase',
        confidence: 0.9,
        source: 'p',
      });
      globalMemory.recordPattern({
        type: 'naming',
        pattern: 'snake_case',
        confidence: 0.6,
        source: 'p',
      });
      globalMemory.recordPattern({
        type: 'async',
        pattern: 'callbacks',
        confidence: 0.5,
        source: 'p',
      });

      aggregator.init();
    });

    test('getPatternsByType returns matching patterns', () => {
      const naming = aggregator.getPatternsByType('naming');
      expect(naming.length).toBe(2);
    });

    test('getDominantPattern returns highest confidence', () => {
      const dominant = aggregator.getDominantPattern('naming');
      expect(dominant.pattern).toBe('camelCase');
    });

    test('getDominantPattern returns null for unknown type', () => {
      const dominant = aggregator.getDominantPattern('unknown');
      expect(dominant).toBeNull();
    });
  });

  describe('analysis methods', () => {
    beforeEach(() => {
      globalMemory.registerProject('/p1', { name: 'p1' });
      globalMemory.registerProject('/p2', { name: 'p2' });

      globalMemory.recordPattern({
        type: 'naming',
        pattern: 'camelCase',
        confidence: 0.9,
        source: 'p1',
      });
      globalMemory.recordPattern({
        type: 'naming',
        pattern: 'camelCase',
        confidence: 0.8,
        source: 'p2',
      });
      globalMemory.recordPattern({
        type: 'naming',
        pattern: 'snake_case',
        confidence: 0.4,
        source: 'p1',
      });
      globalMemory.recordPattern({
        type: 'async',
        pattern: 'promises',
        confidence: 0.7,
        source: 'p1',
      });

      aggregator.init();
    });

    test('analyzePatternDiversity returns type analysis', () => {
      const analysis = aggregator.analyzePatternDiversity();

      expect(analysis.totalPatternTypes).toBe(2);
      expect(analysis.typeAnalysis.naming).toBeDefined();
      expect(analysis.typeAnalysis.naming.variationCount).toBe(2);
      expect(analysis.typeAnalysis.naming.dominant).toBe('camelCase');
    });

    test('getRecommendations returns high-confidence patterns', () => {
      const recs = aggregator.getRecommendations();

      expect(recs.naming).toBeDefined();
      expect(recs.naming.recommended).toBe('camelCase');
    });

    test('compareProjects returns similarity analysis', () => {
      const comparison = aggregator.compareProjects('p1', 'p2');

      expect(comparison.project1).toBe('p1');
      expect(comparison.project2).toBe('p2');
      expect(comparison.similarity).toBeGreaterThan(0);
      expect(comparison.common.length).toBeGreaterThan(0);
    });
  });

  describe('utilities', () => {
    test('getStats returns statistics', () => {
      globalMemory.registerProject('/p', { name: 'p' });
      globalMemory.recordPattern({
        type: 'test',
        pattern: 'value',
        source: 'p',
      });
      aggregator.init();

      const stats = aggregator.getStats();

      expect(stats.totalAggregatedPatterns).toBe(1);
      expect(stats.trackedProjects).toBeGreaterThanOrEqual(1);
      expect(stats.patternTypes).toContain('test');
    });

    test('refresh reloads patterns', () => {
      aggregator.init();
      const sizeBefore = aggregator.aggregatedPatterns.size;

      globalMemory.registerProject('/new', { name: 'new' });
      globalMemory.recordPattern({
        type: 'new',
        pattern: 'pattern',
        source: 'new',
      });

      aggregator.refresh();

      expect(aggregator.aggregatedPatterns.size).toBeGreaterThan(sizeBefore);
    });
  });

  describe('auto-initialization', () => {
    test('methods auto-init if not initialized', () => {
      const consensus = aggregator.getConsensusPatterns();
      expect(aggregator.initialized).toBe(true);
      expect(consensus).toEqual([]);
    });
  });

  describe('CONSENSUS_THRESHOLDS', () => {
    test('exports threshold constants', () => {
      expect(CONSENSUS_THRESHOLDS.STRONG).toBe(0.8);
      expect(CONSENSUS_THRESHOLDS.MODERATE).toBe(0.5);
      expect(CONSENSUS_THRESHOLDS.WEAK).toBe(0.25);
    });
  });
});
