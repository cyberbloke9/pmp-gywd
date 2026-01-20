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

module.exports = {
  // Classes
  GlobalMemory,
  PatternAggregator,

  // Constants
  GLOBAL_DIR,
  PATTERNS_FILE,
  EXPERTISE_FILE,
  PREFERENCES_FILE,
  PROJECTS_FILE,
  CONSENSUS_THRESHOLDS,
  CONFIDENCE_FACTORS,
};
