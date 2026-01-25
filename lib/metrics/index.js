'use strict';

/**
 * GYWD Metrics
 *
 * Performance tracking and metrics for GYWD operations.
 * Zero external dependencies.
 */

const { PerformanceTracker, tracker } = require('./performance-tracker');

module.exports = {
  PerformanceTracker,
  tracker,
};
