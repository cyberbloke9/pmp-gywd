'use strict';

/**
 * Memory Module - Cross-project learning and persistence
 *
 * Provides global memory that persists across all projects,
 * enabling pattern learning and expertise tracking.
 *
 * @module memory
 */

const {
  GlobalMemory,
  GLOBAL_DIR,
  PATTERNS_FILE,
  EXPERTISE_FILE,
  PREFERENCES_FILE,
  PROJECTS_FILE,
} = require('./global-memory');

const {
  PatternAggregator,
  CONSENSUS_THRESHOLDS,
  CONFIDENCE_FACTORS,
} = require('./pattern-aggregator');

const {
  FeedbackCollector,
  FEEDBACK_TYPES,
  SUGGESTION_CATEGORIES,
  FEEDBACK_DIR,
  FEEDBACK_FILE,
  STATS_FILE,
} = require('./feedback-collector');

const {
  ConfidenceCalibrator,
  DEFAULT_PRIOR,
  CALIBRATION_DIR,
  CALIBRATION_FILE,
} = require('./confidence-calibrator');

module.exports = {
  // Classes
  GlobalMemory,
  PatternAggregator,
  FeedbackCollector,
  ConfidenceCalibrator,

  // Constants
  GLOBAL_DIR,
  PATTERNS_FILE,
  EXPERTISE_FILE,
  PREFERENCES_FILE,
  PROJECTS_FILE,
  CONSENSUS_THRESHOLDS,
  CONFIDENCE_FACTORS,
  FEEDBACK_TYPES,
  SUGGESTION_CATEGORIES,
  FEEDBACK_DIR,
  FEEDBACK_FILE,
  STATS_FILE,
  DEFAULT_PRIOR,
  CALIBRATION_DIR,
  CALIBRATION_FILE,
};
