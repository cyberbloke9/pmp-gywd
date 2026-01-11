/**
 * Profile Module
 *
 * Developer Digital Twin - models patterns, preferences, and expertise.
 * Central export for all profile-related functionality.
 */

const { ProfileManager, DEFAULT_PROFILE } = require('./profile-manager');
const { PatternLearner, PATTERN_TYPES, PATTERN_SIGNALS } = require('./pattern-learner');

module.exports = {
  // Classes
  ProfileManager,
  PatternLearner,

  // Constants
  DEFAULT_PROFILE,
  PATTERN_TYPES,
  PATTERN_SIGNALS,

  // Factory function
  createProfileManager: (profileDir) => new ProfileManager(profileDir),
  createPatternLearner: () => new PatternLearner(),
};
