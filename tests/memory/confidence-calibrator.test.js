'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  ConfidenceCalibrator,
  DEFAULT_PRIOR,
} = require('../../lib/memory');

describe('ConfidenceCalibrator', () => {
  let calibrator;
  let testDir;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `gywd-cal-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    calibrator = new ConfidenceCalibrator();

    // Mock file operations
    calibrator._ensureDirectories = () => {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
    };
    const dataFile = path.join(testDir, 'calibration.json');
    calibrator._loadData = () => {
      try {
        if (fs.existsSync(dataFile)) {
          const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
          calibrator.calibrationData = data.calibrationData || {};
          calibrator.predictionHistory = data.predictionHistory || [];
        }
      } catch (err) {
        calibrator.calibrationData = {};
        calibrator.predictionHistory = [];
      }
    };
    calibrator.save = () => {
      fs.writeFileSync(dataFile, JSON.stringify({
        calibrationData: calibrator.calibrationData,
        predictionHistory: calibrator.predictionHistory,
      }, null, 2), 'utf8');
    };

    calibrator.init();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    test('initializes with empty data', () => {
      expect(calibrator.initialized).toBe(true);
      expect(Object.keys(calibrator.calibrationData).length).toBe(0);
    });

    test('init returns this for chaining', () => {
      const newCal = new ConfidenceCalibrator();
      newCal._ensureDirectories = () => {};
      newCal._loadData = () => {};
      const result = newCal.init();
      expect(result).toBe(newCal);
    });
  });

  describe('recordOutcome', () => {
    test('records success outcome', () => {
      calibrator.recordOutcome('pattern:naming', true);

      const data = calibrator.calibrationData['pattern:naming'];
      expect(data.successes).toBe(1);
      expect(data.totalOutcomes).toBe(1);
      expect(data.alpha).toBe(DEFAULT_PRIOR.alpha + 1);
    });

    test('records failure outcome', () => {
      calibrator.recordOutcome('pattern:naming', false);

      const data = calibrator.calibrationData['pattern:naming'];
      expect(data.failures).toBe(1);
      expect(data.beta).toBe(DEFAULT_PRIOR.beta + 1);
    });

    test('records with predicted confidence', () => {
      calibrator.recordOutcome('code:refactor', true, 0.8);

      expect(calibrator.predictionHistory.length).toBe(1);
      expect(calibrator.predictionHistory[0].predictedConfidence).toBe(0.8);
      expect(calibrator.predictionHistory[0].actualOutcome).toBe(true);
    });

    test('limits prediction history size', () => {
      // Record more than 1000 outcomes
      for (let i = 0; i < 1050; i++) {
        calibrator.recordOutcome('test', true, 0.5);
      }

      expect(calibrator.predictionHistory.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('getPosteriorMean', () => {
    test('returns prior mean with no data', () => {
      const mean = calibrator.getPosteriorMean('new:key');
      // Beta(2,2) mean = 2/(2+2) = 0.5
      expect(mean).toBe(0.5);
    });

    test('updates with observations', () => {
      // Record 8 successes, 2 failures
      for (let i = 0; i < 8; i++) {
        calibrator.recordOutcome('test', true);
      }
      for (let i = 0; i < 2; i++) {
        calibrator.recordOutcome('test', false);
      }

      // Beta(2+8, 2+2) = Beta(10, 4) mean = 10/14 ≈ 0.714
      const mean = calibrator.getPosteriorMean('test');
      expect(mean).toBeCloseTo(10 / 14, 2);
    });
  });

  describe('getPosteriorVariance', () => {
    test('returns positive variance', () => {
      const variance = calibrator.getPosteriorVariance('test');
      expect(variance).toBeGreaterThan(0);
    });

    test('variance decreases with more data', () => {
      const varianceBefore = calibrator.getPosteriorVariance('test');

      for (let i = 0; i < 10; i++) {
        calibrator.recordOutcome('test', true);
      }

      const varianceAfter = calibrator.getPosteriorVariance('test');
      expect(varianceAfter).toBeLessThan(varianceBefore);
    });
  });

  describe('getCalibratedConfidence', () => {
    test('returns blended confidence', () => {
      // With no data, should blend toward the raw confidence
      const calibrated = calibrator.getCalibratedConfidence('new', 0.8);
      expect(calibrated).toBeGreaterThan(0);
      expect(calibrated).toBeLessThan(1);
    });

    test('shifts toward observed rate with more data', () => {
      // Record 90% success rate
      for (let i = 0; i < 9; i++) {
        calibrator.recordOutcome('high', true);
      }
      calibrator.recordOutcome('high', false);

      // Low raw confidence should be pulled up toward observed rate
      const calibrated = calibrator.getCalibratedConfidence('high', 0.3);
      expect(calibrated).toBeGreaterThan(0.3);
    });

    test('respects bounds', () => {
      const low = calibrator.getCalibratedConfidence('test', 0.0);
      expect(low).toBeGreaterThanOrEqual(0.01);

      const high = calibrator.getCalibratedConfidence('test', 1.0);
      expect(high).toBeLessThanOrEqual(0.99);
    });
  });

  describe('getCredibleInterval', () => {
    test('returns lower and upper bounds', () => {
      const interval = calibrator.getCredibleInterval('test', 0.95);

      expect(interval.lower).toBeDefined();
      expect(interval.upper).toBeDefined();
      expect(interval.lower).toBeLessThan(interval.upper);
    });

    test('bounds are within 0-1', () => {
      const interval = calibrator.getCredibleInterval('test');

      expect(interval.lower).toBeGreaterThanOrEqual(0);
      expect(interval.upper).toBeLessThanOrEqual(1);
    });

    test('interval narrows with more data', () => {
      const intervalBefore = calibrator.getCredibleInterval('test');
      const widthBefore = intervalBefore.upper - intervalBefore.lower;

      for (let i = 0; i < 20; i++) {
        calibrator.recordOutcome('test', true);
      }

      const intervalAfter = calibrator.getCredibleInterval('test');
      const widthAfter = intervalAfter.upper - intervalAfter.lower;

      expect(widthAfter).toBeLessThan(widthBefore);
    });
  });

  describe('analyzeCalibration', () => {
    test('returns error with insufficient data', () => {
      const analysis = calibrator.analyzeCalibration();
      expect(analysis.error).toBeDefined();
    });

    test('calculates calibration metrics with data', () => {
      // Record enough predictions
      for (let i = 0; i < 20; i++) {
        calibrator.recordOutcome('test', i < 15, 0.7); // 75% success at 0.7 confidence
      }

      const analysis = calibrator.analyzeCalibration();

      expect(analysis.bins).toBeDefined();
      expect(analysis.totalPredictions).toBe(20);
      expect(analysis.calibrationError).toBeDefined();
      expect(analysis.brierScore).toBeDefined();
    });
  });

  describe('isWellCalibrated', () => {
    test('returns true with insufficient data', () => {
      expect(calibrator.isWellCalibrated()).toBe(true);
    });

    test('evaluates calibration with data', () => {
      // Record well-calibrated predictions
      for (let i = 0; i < 20; i++) {
        calibrator.recordOutcome('test', i < 14, 0.7); // ~70% at 0.7
      }

      const result = calibrator.isWellCalibrated();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getAdjustmentFactor', () => {
    test('returns 1.0 with insufficient data', () => {
      const factor = calibrator.getAdjustmentFactor('new');
      expect(factor).toBe(1.0);
    });

    test('adjusts based on observed rate', () => {
      // Record 80% success
      for (let i = 0; i < 8; i++) {
        calibrator.recordOutcome('high', true);
      }
      for (let i = 0; i < 2; i++) {
        calibrator.recordOutcome('high', false);
      }

      const factor = calibrator.getAdjustmentFactor('high');
      expect(factor).toBeGreaterThan(1.0); // Should increase confidence
    });

    test('respects bounds', () => {
      // Very low success rate
      for (let i = 0; i < 1; i++) {
        calibrator.recordOutcome('low', true);
      }
      for (let i = 0; i < 9; i++) {
        calibrator.recordOutcome('low', false);
      }

      const factor = calibrator.getAdjustmentFactor('low');
      expect(factor).toBeGreaterThanOrEqual(0.5);
      expect(factor).toBeLessThanOrEqual(2.0);
    });
  });

  describe('getKeyStats', () => {
    test('returns stats for a key', () => {
      calibrator.recordOutcome('test', true);

      const stats = calibrator.getKeyStats('test');

      expect(stats.key).toBe('test');
      expect(stats.posteriorMean).toBeDefined();
      expect(stats.credibleInterval).toBeDefined();
      expect(stats.totalOutcomes).toBe(1);
    });
  });

  describe('getKeys', () => {
    test('returns all tracked keys', () => {
      calibrator.recordOutcome('key1', true);
      calibrator.recordOutcome('key2', false);

      const keys = calibrator.getKeys();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('getStats', () => {
    test('returns overall statistics', () => {
      calibrator.recordOutcome('test', true);
      calibrator.recordOutcome('test', false);

      const stats = calibrator.getStats();

      expect(stats.keysTracked).toBe(1);
      expect(stats.totalOutcomes).toBe(2);
      expect(stats.overallSuccessRate).toBe(0.5);
    });
  });

  describe('utilities', () => {
    test('clearKey removes specific key', () => {
      calibrator.recordOutcome('keep', true);
      calibrator.recordOutcome('remove', true);

      calibrator.clearKey('remove');

      expect(calibrator.calibrationData.keep).toBeDefined();
      expect(calibrator.calibrationData.remove).toBeUndefined();
    });

    test('clear removes all data', () => {
      calibrator.recordOutcome('test', true, 0.5);

      calibrator.clear();

      expect(Object.keys(calibrator.calibrationData).length).toBe(0);
      expect(calibrator.predictionHistory.length).toBe(0);
    });

    test('export returns data', () => {
      calibrator.recordOutcome('test', true);

      const exported = calibrator.export();

      expect(exported.version).toBe('1.0.0');
      expect(exported.calibrationData).toBeDefined();
    });

    test('import merges data', () => {
      calibrator.recordOutcome('existing', true);

      calibrator.import({
        calibrationData: {
          imported: {
            alpha: 5,
            beta: 3,
            totalOutcomes: 6,
            successes: 3,
            failures: 3,
          },
        },
      });

      expect(calibrator.calibrationData.existing).toBeDefined();
      expect(calibrator.calibrationData.imported).toBeDefined();
    });

    test('getCalibrationDir returns path', () => {
      const dir = ConfidenceCalibrator.getCalibrationDir();
      expect(dir).toContain('.gywd');
      expect(dir).toContain('calibration');
    });
  });

  describe('DEFAULT_PRIOR', () => {
    test('has expected values', () => {
      expect(DEFAULT_PRIOR.alpha).toBe(2);
      expect(DEFAULT_PRIOR.beta).toBe(2);
    });
  });
});
