'use strict';

/**
 * Risk Scorer
 *
 * Calculates risk scores for operations using multiple factors.
 * Part of Phase 30: Permission Scanner.
 */

const { RISK_LEVEL, OPERATION_CATEGORY } = require('./operation-classifier');

/**
 * Risk factor weights
 */
const RISK_WEIGHTS = {
  category: 0.3,
  target: 0.25,
  context: 0.2,
  history: 0.15,
  time: 0.1,
};

/**
 * Risk Scorer class
 */
class RiskScorer {
  constructor(options = {}) {
    this.weights = { ...RISK_WEIGHTS, ...options.weights };
    this.history = [];
    this.maxHistory = options.maxHistory || 100;
    this.contextFactors = options.contextFactors || {};
  }

  /**
   * Calculate risk score for an operation
   * @param {object} classification - Classification from OperationClassifier
   * @param {object} context - Additional context
   * @returns {object} Risk score result
   */
  score(classification, context = {}) {
    const factors = {
      category: this._scoreCategoryRisk(classification.category),
      target: this._scoreTargetRisk(classification.operation, context),
      context: this._scoreContextRisk(context),
      history: this._scoreHistoryRisk(classification.operation),
      time: this._scoreTimeRisk(),
    };

    // Calculate weighted score (0-100)
    let totalScore = 0;
    for (const [factor, weight] of Object.entries(this.weights)) {
      totalScore += factors[factor] * weight;
    }

    // Normalize to 0-100
    const normalizedScore = Math.min(100, Math.max(0, totalScore));

    // Determine risk level from score
    const riskLevel = this._scoreToRiskLevel(normalizedScore);

    // Record in history
    this._recordHistory(classification.operation, normalizedScore);

    return {
      score: normalizedScore,
      riskLevel,
      factors,
      recommendation: this._getRecommendation(normalizedScore, riskLevel),
      autoApprove: normalizedScore <= 30,
      requiresReview: normalizedScore > 30 && normalizedScore <= 60,
      blocked: normalizedScore > 80,
    };
  }

  /**
   * Score risk based on operation category
   * @param {string} category
   * @returns {number} Score 0-100
   */
  _scoreCategoryRisk(category) {
    const categoryScores = {
      [OPERATION_CATEGORY.FILE_READ]: 10,
      [OPERATION_CATEGORY.DATABASE_READ]: 15,
      [OPERATION_CATEGORY.NETWORK_READ]: 25,
      [OPERATION_CATEGORY.FILE_WRITE]: 40,
      [OPERATION_CATEGORY.PROCESS_SPAWN]: 50,
      [OPERATION_CATEGORY.DATABASE_WRITE]: 60,
      [OPERATION_CATEGORY.NETWORK_WRITE]: 70,
      [OPERATION_CATEGORY.FILE_DELETE]: 75,
      [OPERATION_CATEGORY.FILE_EXECUTE]: 80,
      [OPERATION_CATEGORY.SYSTEM_CONFIG]: 90,
      [OPERATION_CATEGORY.CREDENTIAL_ACCESS]: 95,
      [OPERATION_CATEGORY.UNKNOWN]: 50,
    };

    return categoryScores[category] || 50;
  }

  /**
   * Score risk based on target paths/resources
   * @param {string} operation
   * @param {object} context
   * @returns {number} Score 0-100
   */
  _scoreTargetRisk(operation, context) {
    let score = 20; // Base score

    // Sensitive paths
    const sensitivePatterns = [
      { pattern: /\/etc\/passwd/i, score: 90 },
      { pattern: /\/etc\/shadow/i, score: 100 },
      { pattern: /\.ssh\/id_/i, score: 95 },
      { pattern: /\.aws\/credentials/i, score: 95 },
      { pattern: /\.env/i, score: 80 },
      { pattern: /\/root\//i, score: 70 },
      { pattern: /\/home\/[^/]+\//i, score: 40 },
      { pattern: /node_modules/i, score: 20 },
      { pattern: /\.git\//i, score: 30 },
      { pattern: /package\.json/i, score: 25 },
    ];

    for (const { pattern, score: patternScore } of sensitivePatterns) {
      if (pattern.test(operation)) {
        score = Math.max(score, patternScore);
      }
    }

    // Project context affects risk
    if (context.isProjectFile) {
      score = Math.min(score, 40); // Cap risk for project files
    }

    if (context.isTestFile) {
      score = Math.min(score, 30); // Lower risk for test files
    }

    return score;
  }

  /**
   * Score risk based on execution context
   * @param {object} context
   * @returns {number} Score 0-100
   */
  _scoreContextRisk(context) {
    let score = 30; // Base score

    // User trust level
    if (context.userTrustLevel === 'high') {
      score -= 20;
    } else if (context.userTrustLevel === 'low') {
      score += 20;
    }

    // Environment
    if (context.environment === 'production') {
      score += 30;
    } else if (context.environment === 'development') {
      score -= 15;
    } else if (context.environment === 'test') {
      score -= 25;
    }

    // Previous approvals
    if (context.previouslyApproved) {
      score -= 15;
    }

    // CI/CD context
    if (context.isCI) {
      score -= 10; // Slightly lower risk in CI
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Score risk based on operation history
   * @param {string} operation
   * @returns {number} Score 0-100
   */
  _scoreHistoryRisk(operation) {
    // Find similar operations in history
    const similar = this.history.filter(h => {
      return this._operationSimilarity(h.operation, operation) > 0.7;
    });

    if (similar.length === 0) {
      return 50; // Unknown operation, medium risk
    }

    // Average previous scores
    const avgScore = similar.reduce((sum, h) => sum + h.score, 0) / similar.length;

    // Recent failures increase risk
    const recentFailures = similar.filter(h => h.failed && h.timestamp > Date.now() - 3600000).length;
    const failurePenalty = recentFailures * 10;

    return Math.min(100, avgScore + failurePenalty);
  }

  /**
   * Score risk based on time factors
   * @returns {number} Score 0-100
   */
  _scoreTimeRisk() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    let score = 30; // Base score

    // Off-hours operations are slightly riskier
    if (hour < 6 || hour > 22) {
      score += 15;
    }

    // Weekend operations
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      score += 10;
    }

    return score;
  }

  /**
   * Calculate similarity between operations
   * @param {string} op1
   * @param {string} op2
   * @returns {number} Similarity 0-1
   */
  _operationSimilarity(op1, op2) {
    const words1 = new Set(op1.toLowerCase().split(/\s+/));
    const words2 = new Set(op2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Convert score to risk level
   * @param {number} score
   * @returns {string}
   */
  _scoreToRiskLevel(score) {
    if (score <= 20) return RISK_LEVEL.SAFE;
    if (score <= 40) return RISK_LEVEL.LOW;
    if (score <= 60) return RISK_LEVEL.MEDIUM;
    if (score <= 80) return RISK_LEVEL.HIGH;
    return RISK_LEVEL.CRITICAL;
  }

  /**
   * Get recommendation based on score
   * @param {number} score
   * @param {string} riskLevel
   * @returns {string}
   */
  _getRecommendation(score, riskLevel) {
    if (score <= 30) {
      return 'Auto-approve: Low risk operation';
    } else if (score <= 50) {
      return 'Review recommended: Moderate risk operation';
    } else if (score <= 70) {
      return 'Review required: Elevated risk operation';
    } else if (score <= 90) {
      return 'Careful review required: High risk operation';
    }
    return 'Block: Critical risk operation';
  }

  /**
   * Record operation in history
   * @param {string} operation
   * @param {number} score
   */
  _recordHistory(operation, score) {
    this.history.push({
      operation,
      score,
      timestamp: Date.now(),
      failed: false,
    });

    // Trim history
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  /**
   * Mark an operation as failed
   * @param {string} operation
   */
  markFailed(operation) {
    const entry = this.history.find(h => h.operation === operation);
    if (entry) {
      entry.failed = true;
    }
  }

  /**
   * Get risk statistics
   * @returns {object}
   */
  getStats() {
    if (this.history.length === 0) {
      return { count: 0, avgScore: 0, failureRate: 0 };
    }

    const avgScore = this.history.reduce((sum, h) => sum + h.score, 0) / this.history.length;
    const failures = this.history.filter(h => h.failed).length;
    const failureRate = failures / this.history.length;

    return {
      count: this.history.length,
      avgScore: Math.round(avgScore * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      recentOperations: this.history.slice(-10).map(h => ({
        operation: h.operation.substring(0, 50),
        score: h.score,
        failed: h.failed,
      })),
    };
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }
}

module.exports = {
  RiskScorer,
  RISK_WEIGHTS,
};
