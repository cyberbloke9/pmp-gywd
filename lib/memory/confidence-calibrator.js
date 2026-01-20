'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Calibration storage location
 */
const CALIBRATION_DIR = path.join(os.homedir(), '.gywd', 'calibration');
const CALIBRATION_FILE = path.join(CALIBRATION_DIR, 'calibration.json');

/**
 * Default prior parameters (Beta distribution)
 */
const DEFAULT_PRIOR = {
  alpha: 2, // Prior successes + 1
  beta: 2, // Prior failures + 1
};

/**
 * ConfidenceCalibrator - Bayesian confidence scoring
 *
 * Uses Bayesian updating with Beta-Binomial model to:
 * - Maintain calibrated confidence estimates
 * - Update beliefs based on observed outcomes
 * - Track prediction accuracy over time
 *
 * @example
 * const calibrator = new ConfidenceCalibrator();
 * calibrator.init();
 *
 * // Record outcomes
 * calibrator.recordOutcome('pattern:naming', true);  // success
 * calibrator.recordOutcome('pattern:naming', false); // failure
 *
 * // Get calibrated confidence
 * const conf = calibrator.getCalibratedConfidence('pattern:naming', 0.8);
 */
class ConfidenceCalibrator {
  constructor() {
    this.calibrationData = {};
    this.predictionHistory = [];
    this.initialized = false;
  }

  /**
   * Initialize the calibrator
   * @returns {ConfidenceCalibrator} this for chaining
   */
  init() {
    this._ensureDirectories();
    this._loadData();
    this.initialized = true;
    return this;
  }

  /**
   * Ensure directories exist
   * @private
   */
  _ensureDirectories() {
    if (!fs.existsSync(CALIBRATION_DIR)) {
      fs.mkdirSync(CALIBRATION_DIR, { recursive: true });
    }
  }

  /**
   * Load calibration data
   * @private
   */
  _loadData() {
    try {
      if (fs.existsSync(CALIBRATION_FILE)) {
        const data = JSON.parse(fs.readFileSync(CALIBRATION_FILE, 'utf8'));
        this.calibrationData = data.calibrationData || {};
        this.predictionHistory = data.predictionHistory || [];
      }
    } catch (err) {
      this.calibrationData = {};
      this.predictionHistory = [];
    }
  }

  /**
   * Save calibration data
   */
  save() {
    this._ensureDirectories();
    fs.writeFileSync(CALIBRATION_FILE, JSON.stringify({
      calibrationData: this.calibrationData,
      predictionHistory: this.predictionHistory,
    }, null, 2), 'utf8');
  }

  // ==================== BAYESIAN UPDATING ====================

  /**
   * Get or create calibration data for a key
   * @private
   * @param {string} key - Calibration key
   * @returns {object} Calibration data with alpha, beta
   */
  _getCalibrationData(key) {
    if (!this.calibrationData[key]) {
      this.calibrationData[key] = {
        alpha: DEFAULT_PRIOR.alpha,
        beta: DEFAULT_PRIOR.beta,
        totalOutcomes: 0,
        successes: 0,
        failures: 0,
        lastUpdated: null,
      };
    }
    return this.calibrationData[key];
  }

  /**
   * Record an outcome for Bayesian updating
   * @param {string} key - Calibration key (e.g., 'pattern:naming')
   * @param {boolean} success - Whether the prediction was successful
   * @param {number} [predictedConfidence] - The confidence that was predicted
   */
  recordOutcome(key, success, predictedConfidence = null) {
    if (!this.initialized) this.init();

    const data = this._getCalibrationData(key);

    // Bayesian update: add to alpha for success, beta for failure
    if (success) {
      data.alpha += 1;
      data.successes += 1;
    } else {
      data.beta += 1;
      data.failures += 1;
    }

    data.totalOutcomes += 1;
    data.lastUpdated = new Date().toISOString();

    // Record in prediction history for calibration analysis
    if (predictedConfidence !== null) {
      this.predictionHistory.push({
        key,
        predictedConfidence,
        actualOutcome: success,
        timestamp: new Date().toISOString(),
      });

      // Keep history manageable
      if (this.predictionHistory.length > 1000) {
        this.predictionHistory = this.predictionHistory.slice(-1000);
      }
    }

    this.save();
  }

  /**
   * Get the posterior mean (expected probability of success)
   * @param {string} key - Calibration key
   * @returns {number} Posterior mean 0-1
   */
  getPosteriorMean(key) {
    if (!this.initialized) this.init();

    const data = this._getCalibrationData(key);
    // Beta distribution mean = alpha / (alpha + beta)
    return data.alpha / (data.alpha + data.beta);
  }

  /**
   * Get the posterior variance (uncertainty)
   * @param {string} key - Calibration key
   * @returns {number} Posterior variance
   */
  getPosteriorVariance(key) {
    if (!this.initialized) this.init();

    const data = this._getCalibrationData(key);
    const a = data.alpha;
    const b = data.beta;
    // Beta distribution variance
    return (a * b) / ((a + b) ** 2 * (a + b + 1));
  }

  /**
   * Get calibrated confidence using Bayesian shrinkage
   * @param {string} key - Calibration key
   * @param {number} rawConfidence - Original confidence 0-1
   * @returns {number} Calibrated confidence 0-1
   */
  getCalibratedConfidence(key, rawConfidence) {
    if (!this.initialized) this.init();

    const data = this._getCalibrationData(key);
    const posteriorMean = this.getPosteriorMean(key);

    // Calculate shrinkage factor based on sample size
    // More data = more weight on observed rate, less on prior
    const n = data.totalOutcomes;
    const priorWeight = (DEFAULT_PRIOR.alpha + DEFAULT_PRIOR.beta) / (n + DEFAULT_PRIOR.alpha + DEFAULT_PRIOR.beta);
    const dataWeight = 1 - priorWeight;

    // Blend raw confidence with posterior mean
    // If we have lots of data, trust the observed rate more
    // If we have little data, trust the raw confidence more
    const calibrated = rawConfidence * priorWeight + posteriorMean * dataWeight;

    // Ensure bounds
    return Math.max(0.01, Math.min(0.99, calibrated));
  }

  /**
   * Get credible interval for confidence
   * @param {string} key - Calibration key
   * @param {number} [level=0.95] - Credible level (e.g., 0.95 for 95%)
   * @returns {object} { lower, upper } bounds
   */
  getCredibleInterval(key, level = 0.95) {
    if (!this.initialized) this.init();

    // Ensure key exists (side effect)
    this._getCalibrationData(key);

    // Approximation using normal distribution for large samples
    // For small samples, this is a rough estimate
    const mean = this.getPosteriorMean(key);
    const variance = this.getPosteriorVariance(key);
    const std = Math.sqrt(variance);

    // Z-score for credible level
    const z = this._getZScore(level);

    return {
      lower: Math.max(0, mean - z * std),
      upper: Math.min(1, mean + z * std),
    };
  }

  /**
   * Get Z-score for a given confidence level
   * @private
   */
  _getZScore(level) {
    // Common values
    const zScores = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };
    return zScores[level] || 1.96;
  }

  // ==================== CALIBRATION ANALYSIS ====================

  /**
   * Analyze calibration accuracy
   * Groups predictions by confidence bin and compares to actual outcomes
   * @returns {object} Calibration analysis
   */
  analyzeCalibration() {
    if (!this.initialized) this.init();

    if (this.predictionHistory.length < 10) {
      return { error: 'Insufficient data for calibration analysis' };
    }

    // Group by confidence bins
    const bins = [
      { min: 0.0, max: 0.2, predictions: [], outcomes: [] },
      { min: 0.2, max: 0.4, predictions: [], outcomes: [] },
      { min: 0.4, max: 0.6, predictions: [], outcomes: [] },
      { min: 0.6, max: 0.8, predictions: [], outcomes: [] },
      { min: 0.8, max: 1.0, predictions: [], outcomes: [] },
    ];

    for (const entry of this.predictionHistory) {
      for (const bin of bins) {
        if (entry.predictedConfidence >= bin.min && entry.predictedConfidence < bin.max) {
          bin.predictions.push(entry.predictedConfidence);
          bin.outcomes.push(entry.actualOutcome ? 1 : 0);
          break;
        }
      }
    }

    // Calculate calibration metrics
    const analysis = {
      bins: bins.map(bin => ({
        range: `${bin.min.toFixed(1)}-${bin.max.toFixed(1)}`,
        count: bin.predictions.length,
        meanPredicted: bin.predictions.length > 0
          ? bin.predictions.reduce((a, b) => a + b, 0) / bin.predictions.length
          : 0,
        actualRate: bin.outcomes.length > 0
          ? bin.outcomes.reduce((a, b) => a + b, 0) / bin.outcomes.length
          : 0,
      })),
      totalPredictions: this.predictionHistory.length,
    };

    // Calculate calibration error (mean absolute error between predicted and actual)
    let totalError = 0;
    let countWithData = 0;
    for (const bin of analysis.bins) {
      if (bin.count >= 3) {
        totalError += Math.abs(bin.meanPredicted - bin.actualRate);
        countWithData++;
      }
    }
    analysis.calibrationError = countWithData > 0 ? totalError / countWithData : 0;

    // Brier score (lower is better)
    let brierSum = 0;
    for (const entry of this.predictionHistory) {
      const outcome = entry.actualOutcome ? 1 : 0;
      brierSum += (entry.predictedConfidence - outcome) ** 2;
    }
    analysis.brierScore = brierSum / this.predictionHistory.length;

    return analysis;
  }

  /**
   * Check if predictions are well-calibrated
   * @returns {boolean} Whether calibration is acceptable
   */
  isWellCalibrated() {
    const analysis = this.analyzeCalibration();
    if (analysis.error) return true; // Assume well-calibrated with insufficient data

    // Calibration error < 0.1 is considered good
    return analysis.calibrationError < 0.1;
  }

  /**
   * Get calibration adjustment factor
   * @param {string} key - Calibration key
   * @returns {number} Adjustment factor (multiply raw confidence by this)
   */
  getAdjustmentFactor(key) {
    if (!this.initialized) this.init();

    const data = this._getCalibrationData(key);
    if (data.totalOutcomes < 3) return 1.0; // Not enough data

    const observedRate = data.successes / data.totalOutcomes;
    const expectedRate = 0.5; // Assume predictions claim 50% average

    // Adjustment to bring predictions closer to observed reality
    return Math.max(0.5, Math.min(2.0, observedRate / expectedRate));
  }

  // ==================== UTILITIES ====================

  /**
   * Get statistics for a key
   * @param {string} key - Calibration key
   * @returns {object} Statistics
   */
  getKeyStats(key) {
    if (!this.initialized) this.init();

    const data = this._getCalibrationData(key);
    const interval = this.getCredibleInterval(key);

    return {
      key,
      posteriorMean: this.getPosteriorMean(key),
      posteriorVariance: this.getPosteriorVariance(key),
      credibleInterval: interval,
      totalOutcomes: data.totalOutcomes,
      successRate: data.totalOutcomes > 0
        ? data.successes / data.totalOutcomes
        : 0.5,
      lastUpdated: data.lastUpdated,
    };
  }

  /**
   * Get all calibration keys
   * @returns {Array} List of keys
   */
  getKeys() {
    if (!this.initialized) this.init();
    return Object.keys(this.calibrationData);
  }

  /**
   * Get overall statistics
   * @returns {object} Statistics
   */
  getStats() {
    if (!this.initialized) this.init();

    const keys = this.getKeys();
    let totalOutcomes = 0;
    let totalSuccesses = 0;

    for (const key of keys) {
      const data = this.calibrationData[key];
      totalOutcomes += data.totalOutcomes;
      totalSuccesses += data.successes;
    }

    return {
      keysTracked: keys.length,
      totalOutcomes,
      overallSuccessRate: totalOutcomes > 0 ? totalSuccesses / totalOutcomes : 0.5,
      predictionHistorySize: this.predictionHistory.length,
      isWellCalibrated: this.isWellCalibrated(),
    };
  }

  /**
   * Clear calibration data for a key
   * @param {string} key - Key to clear
   */
  clearKey(key) {
    if (!this.initialized) this.init();
    delete this.calibrationData[key];
    this.save();
  }

  /**
   * Clear all calibration data
   */
  clear() {
    this.calibrationData = {};
    this.predictionHistory = [];
    this.save();
  }

  /**
   * Export calibration data
   * @returns {object} Exportable data
   */
  export() {
    if (!this.initialized) this.init();

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      calibrationData: this.calibrationData,
      predictionHistory: this.predictionHistory,
    };
  }

  /**
   * Import calibration data
   * @param {object} data - Data to import
   */
  import(data) {
    if (!this.initialized) this.init();

    if (data.calibrationData) {
      this.calibrationData = { ...this.calibrationData, ...data.calibrationData };
    }
    if (data.predictionHistory) {
      this.predictionHistory = [
        ...this.predictionHistory,
        ...data.predictionHistory,
      ].slice(-1000);
    }

    this.save();
  }

  /**
   * Get calibration directory path
   * @returns {string} Directory path
   */
  static getCalibrationDir() {
    return CALIBRATION_DIR;
  }
}

module.exports = {
  ConfidenceCalibrator,
  DEFAULT_PRIOR,
  CALIBRATION_DIR,
  CALIBRATION_FILE,
};
