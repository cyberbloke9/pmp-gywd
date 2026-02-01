'use strict';

/**
 * GYWD Permissions
 *
 * Permission scanning and auto-approval system.
 */

const { OperationClassifier, RISK_LEVEL, OPERATION_CATEGORY } = require('./operation-classifier');
const { RiskScorer, RISK_WEIGHTS } = require('./risk-scorer');
const { PermissionRouter, PERMISSION_DECISION } = require('./permission-router');

module.exports = {
  // Classifier
  OperationClassifier,
  RISK_LEVEL,
  OPERATION_CATEGORY,

  // Scorer
  RiskScorer,
  RISK_WEIGHTS,

  // Router
  PermissionRouter,
  PERMISSION_DECISION,
};
