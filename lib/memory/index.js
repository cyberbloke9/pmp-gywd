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

module.exports = {
  // Classes
  GlobalMemory,

  // Constants
  GLOBAL_DIR,
  PATTERNS_FILE,
  EXPERTISE_FILE,
  PREFERENCES_FILE,
  PROJECTS_FILE,
};
