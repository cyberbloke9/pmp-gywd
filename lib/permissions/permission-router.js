'use strict';

/**
 * Permission Router
 *
 * Routes permission requests based on risk assessment.
 * Auto-approves safe operations, routes dangerous ones to user.
 * Part of Phase 30: Permission Scanner.
 */

const { EventEmitter } = require('events');
const { OperationClassifier, RISK_LEVEL } = require('./operation-classifier');
const { RiskScorer } = require('./risk-scorer');

/**
 * Permission decision types
 */
const PERMISSION_DECISION = {
  AUTO_APPROVED: 'auto_approved',
  USER_APPROVED: 'user_approved',
  USER_DENIED: 'user_denied',
  BLOCKED: 'blocked',
  PENDING: 'pending',
};

/**
 * Permission Router class
 */
class PermissionRouter extends EventEmitter {
  constructor(options = {}) {
    super();

    this.classifier = options.classifier || new OperationClassifier(options.classifierOptions);
    this.scorer = options.scorer || new RiskScorer(options.scorerOptions);

    // Thresholds
    this.autoApproveThreshold = options.autoApproveThreshold || 30;
    this.blockThreshold = options.blockThreshold || 85;

    // Pending requests
    this.pendingRequests = new Map();

    // Decision log
    this.decisionLog = [];
    this.maxLogSize = options.maxLogSize || 500;

    // Callbacks
    this.onUserPrompt = options.onUserPrompt || null;
  }

  /**
   * Request permission for an operation
   * @param {string|object} operation - Operation to evaluate
   * @param {object} context - Execution context
   * @returns {Promise<object>} Permission decision
   */
  async requestPermission(operation, context = {}) {
    const requestId = this._generateRequestId();
    const timestamp = Date.now();

    // Classify the operation
    const classification = this.classifier.classify(operation);

    // Score the risk
    const riskScore = this.scorer.score(classification, context);

    // Build request object
    const request = {
      id: requestId,
      operation: classification.operation,
      category: classification.category,
      classification,
      riskScore,
      context,
      timestamp,
      decision: null,
    };

    // Determine decision
    if (classification.blocked) {
      request.decision = {
        type: PERMISSION_DECISION.BLOCKED,
        reason: classification.reason,
        autoDecided: true,
      };
    } else if (riskScore.score <= this.autoApproveThreshold) {
      request.decision = {
        type: PERMISSION_DECISION.AUTO_APPROVED,
        reason: 'Operation within safe threshold',
        autoDecided: true,
      };
    } else if (riskScore.score >= this.blockThreshold) {
      request.decision = {
        type: PERMISSION_DECISION.BLOCKED,
        reason: 'Operation exceeds risk threshold',
        autoDecided: true,
      };
    } else {
      // Needs user decision
      request.decision = await this._promptUser(request);
    }

    // Log the decision
    this._logDecision(request);

    // Emit events
    this.emit('decision', request);

    if (request.decision.type === PERMISSION_DECISION.AUTO_APPROVED) {
      this.emit('autoApproved', request);
    } else if (request.decision.type === PERMISSION_DECISION.BLOCKED) {
      this.emit('blocked', request);
    }

    return request;
  }

  /**
   * Prompt user for permission decision
   * @param {object} request
   * @returns {Promise<object>}
   */
  async _promptUser(request) {
    return new Promise((resolve) => {
      // Store in pending
      this.pendingRequests.set(request.id, {
        request,
        resolve,
        timestamp: Date.now(),
      });

      this.emit('userPromptRequired', {
        requestId: request.id,
        operation: request.operation,
        category: request.category,
        riskLevel: request.riskScore.riskLevel,
        riskScore: request.riskScore.score,
        recommendation: request.riskScore.recommendation,
      });

      // If callback provided, call it
      if (this.onUserPrompt) {
        const userDecision = this.onUserPrompt(request);

        if (userDecision instanceof Promise) {
          userDecision.then(decision => {
            this.handleUserDecision(request.id, decision);
          });
        } else {
          this.handleUserDecision(request.id, userDecision);
        }
      }
    });
  }

  /**
   * Handle user's decision for a pending request
   * @param {string} requestId
   * @param {boolean} approved
   * @param {string} reason
   */
  handleUserDecision(requestId, approved, reason = '') {
    const pending = this.pendingRequests.get(requestId);

    if (!pending) {
      throw new Error(`No pending request found: ${requestId}`);
    }

    const decision = {
      type: approved ? PERMISSION_DECISION.USER_APPROVED : PERMISSION_DECISION.USER_DENIED,
      reason: reason || (approved ? 'User approved' : 'User denied'),
      autoDecided: false,
      decidedAt: Date.now(),
    };

    pending.resolve(decision);
    this.pendingRequests.delete(requestId);

    this.emit('userDecided', {
      requestId,
      approved,
      reason,
    });

    return decision;
  }

  /**
   * Check if an operation is allowed without prompting
   * @param {string|object} operation
   * @param {object} context
   * @returns {object}
   */
  check(operation, context = {}) {
    const classification = this.classifier.classify(operation);
    const riskScore = this.scorer.score(classification, context);

    return {
      allowed: !classification.blocked && riskScore.score < this.blockThreshold,
      autoApprovable: riskScore.score <= this.autoApproveThreshold,
      needsReview: riskScore.score > this.autoApproveThreshold && riskScore.score < this.blockThreshold,
      blocked: classification.blocked || riskScore.score >= this.blockThreshold,
      riskScore: riskScore.score,
      riskLevel: riskScore.riskLevel,
      category: classification.category,
    };
  }

  /**
   * Batch check multiple operations
   * @param {Array} operations
   * @param {object} context
   * @returns {Array}
   */
  batchCheck(operations, context = {}) {
    return operations.map(op => ({
      operation: typeof op === 'string' ? op : op.command || op.action,
      ...this.check(op, context),
    }));
  }

  /**
   * Add operation to allowlist
   * @param {string} pattern
   */
  allow(pattern) {
    this.classifier.allow(pattern);
    this.emit('allowlistUpdated', { pattern, action: 'add' });
  }

  /**
   * Add operation to blocklist
   * @param {string} pattern
   */
  block(pattern) {
    this.classifier.block(pattern);
    this.emit('blocklistUpdated', { pattern, action: 'add' });
  }

  /**
   * Log a permission decision
   * @param {object} request
   */
  _logDecision(request) {
    this.decisionLog.push({
      id: request.id,
      operation: request.operation.substring(0, 100),
      category: request.category,
      riskScore: request.riskScore.score,
      decision: request.decision.type,
      autoDecided: request.decision.autoDecided,
      timestamp: request.timestamp,
    });

    // Trim log
    if (this.decisionLog.length > this.maxLogSize) {
      this.decisionLog = this.decisionLog.slice(-this.maxLogSize);
    }
  }

  /**
   * Generate unique request ID
   * @returns {string}
   */
  _generateRequestId() {
    return `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get decision statistics
   * @returns {object}
   */
  getStats() {
    const stats = {
      totalDecisions: this.decisionLog.length,
      autoApproved: 0,
      userApproved: 0,
      userDenied: 0,
      blocked: 0,
      avgRiskScore: 0,
      pendingCount: this.pendingRequests.size,
    };

    let totalRisk = 0;

    for (const entry of this.decisionLog) {
      totalRisk += entry.riskScore;

      switch (entry.decision) {
        case PERMISSION_DECISION.AUTO_APPROVED:
          stats.autoApproved++;
          break;
        case PERMISSION_DECISION.USER_APPROVED:
          stats.userApproved++;
          break;
        case PERMISSION_DECISION.USER_DENIED:
          stats.userDenied++;
          break;
        case PERMISSION_DECISION.BLOCKED:
          stats.blocked++;
          break;
      }
    }

    stats.avgRiskScore = this.decisionLog.length > 0
      ? Math.round(totalRisk / this.decisionLog.length * 100) / 100
      : 0;

    stats.autoApprovalRate = this.decisionLog.length > 0
      ? Math.round(stats.autoApproved / this.decisionLog.length * 10000) / 100
      : 0;

    return stats;
  }

  /**
   * Get recent decisions
   * @param {number} count
   * @returns {Array}
   */
  getRecentDecisions(count = 10) {
    return this.decisionLog.slice(-count);
  }

  /**
   * Get pending requests
   * @returns {Array}
   */
  getPendingRequests() {
    return Array.from(this.pendingRequests.values()).map(p => ({
      id: p.request.id,
      operation: p.request.operation,
      riskScore: p.request.riskScore.score,
      timestamp: p.timestamp,
    }));
  }

  /**
   * Clear decision log
   */
  clearLog() {
    this.decisionLog = [];
  }
}

module.exports = {
  PermissionRouter,
  PERMISSION_DECISION,
};
