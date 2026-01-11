/**
 * Profile Manager
 *
 * Manages developer profile persistence and loading.
 * The Developer Digital Twin - models patterns, preferences, and expertise.
 */

const fs = require('fs');
const path = require('path');

/**
 * Default profile structure
 */
const DEFAULT_PROFILE = {
  version: '3.0.0',
  created: null,
  lastUpdated: null,
  cognitive: {
    problemApproach: 'unknown', // 'top-down', 'bottom-up', 'hybrid'
    abstractionPreference: 'unknown', // 'concrete', 'abstract', 'balanced'
    debuggingStyle: 'unknown', // 'systematic', 'intuitive', 'mixed'
    learningMode: 'unknown', // 'documentation', 'examples', 'experimentation'
  },
  communication: {
    verbosity: 'medium', // 'minimal', 'medium', 'detailed'
    formality: 'professional', // 'casual', 'professional', 'formal'
    documentationStyle: 'inline', // 'inline', 'jsdoc', 'readme', 'minimal'
    explanationDepth: 'moderate', // 'brief', 'moderate', 'thorough'
  },
  tooling: {
    primaryLanguages: [],
    testingFrameworks: [],
    buildTools: [],
    preferredPatterns: [],
    avoidedPatterns: [],
  },
  domain: {
    primaryDomains: [],
    expertiseAreas: [],
    industryContext: null, // 'healthcare', 'fintech', 'gaming', etc.
  },
  quality: {
    testCoverage: 'standard', // 'minimal', 'standard', 'comprehensive'
    codeStyle: 'standard', // 'compact', 'standard', 'verbose'
    errorHandling: 'defensive', // 'minimal', 'defensive', 'paranoid'
    documentationLevel: 'moderate', // 'minimal', 'moderate', 'extensive'
  },
  interactions: {
    totalSessions: 0,
    questionsAsked: 0,
    decisionsRecorded: 0,
    patternsLearned: 0,
  },
  patterns: [],
  preferences: {},
};

/**
 * Profile Manager class
 */
class ProfileManager {
  /**
   * @param {string} profileDir - Directory to store profile data
   */
  constructor(profileDir) {
    this.profileDir = profileDir;
    this.profilePath = path.join(profileDir, 'developer-profile.json');
    this.profile = null;
  }

  /**
   * Initialize or load the profile
   * @returns {object} The profile object
   */
  init() {
    if (!fs.existsSync(this.profileDir)) {
      fs.mkdirSync(this.profileDir, { recursive: true });
    }

    if (fs.existsSync(this.profilePath)) {
      return this.load();
    }

    return this.create();
  }

  /**
   * Create a new profile
   * @returns {object} The new profile
   */
  create() {
    const now = new Date().toISOString();
    this.profile = {
      ...JSON.parse(JSON.stringify(DEFAULT_PROFILE)),
      created: now,
      lastUpdated: now,
    };
    this.save();
    return this.profile;
  }

  /**
   * Load existing profile
   * @returns {object} The loaded profile
   */
  load() {
    try {
      const content = fs.readFileSync(this.profilePath, 'utf8');
      this.profile = JSON.parse(content);

      // Merge with defaults for any missing fields
      this.profile = this.mergeWithDefaults(this.profile);
      return this.profile;
    } catch (error) {
      // If load fails, create new profile
      return this.create();
    }
  }

  /**
   * Merge loaded profile with defaults
   * @param {object} loaded - The loaded profile
   * @returns {object} Merged profile
   */
  mergeWithDefaults(loaded) {
    const merged = JSON.parse(JSON.stringify(DEFAULT_PROFILE));

    const deepMerge = (target, source) => {
      for (const key of Object.keys(source)) {
        if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          deepMerge(target[key], source[key]);
        } else if (source[key] !== null && source[key] !== undefined) {
          target[key] = source[key];
        }
      }
    };

    deepMerge(merged, loaded);
    return merged;
  }

  /**
   * Save the current profile
   */
  save() {
    if (!this.profile) return;

    this.profile.lastUpdated = new Date().toISOString();
    fs.writeFileSync(
      this.profilePath,
      JSON.stringify(this.profile, null, 2),
    );
  }

  /**
   * Get the current profile
   * @returns {object|null} The profile or null
   */
  getProfile() {
    return this.profile;
  }

  /**
   * Update a specific section of the profile
   * @param {string} section - Section name (e.g., 'cognitive', 'tooling')
   * @param {object} updates - Updates to apply
   */
  updateSection(section, updates) {
    if (!this.profile) this.init();

    if (this.profile[section]) {
      this.profile[section] = {
        ...this.profile[section],
        ...updates,
      };
      this.save();
    }
  }

  /**
   * Record a preference
   * @param {string} key - Preference key
   * @param {any} value - Preference value
   * @param {number} confidence - Confidence level (0-1)
   */
  recordPreference(key, value, confidence = 0.5) {
    if (!this.profile) this.init();

    this.profile.preferences[key] = {
      value,
      confidence,
      recordedAt: new Date().toISOString(),
    };
    this.save();
  }

  /**
   * Record a learned pattern
   * @param {object} pattern - Pattern object with type, description, examples
   */
  recordPattern(pattern) {
    if (!this.profile) this.init();

    const patternEntry = {
      ...pattern,
      id: `pattern-${Date.now()}`,
      learnedAt: new Date().toISOString(),
    };

    this.profile.patterns.push(patternEntry);
    this.profile.interactions.patternsLearned++;
    this.save();
  }

  /**
   * Increment interaction counters
   * @param {string} type - Type of interaction ('session', 'question', 'decision')
   */
  recordInteraction(type) {
    if (!this.profile) this.init();

    switch (type) {
      case 'session':
        this.profile.interactions.totalSessions++;
        break;
      case 'question':
        this.profile.interactions.questionsAsked++;
        break;
      case 'decision':
        this.profile.interactions.decisionsRecorded++;
        break;
      default:
        // Unknown interaction type, ignore
        break;
    }
    this.save();
  }

  /**
   * Add a language to primary languages
   * @param {string} language - Language name
   */
  addLanguage(language) {
    if (!this.profile) this.init();

    const langs = this.profile.tooling.primaryLanguages;
    if (!langs.includes(language)) {
      langs.push(language);
      this.save();
    }
  }

  /**
   * Add a domain expertise area
   * @param {string} area - Expertise area
   */
  addExpertise(area) {
    if (!this.profile) this.init();

    const areas = this.profile.domain.expertiseAreas;
    if (!areas.includes(area)) {
      areas.push(area);
      this.save();
    }
  }

  /**
   * Get a summary of the profile for context
   * @returns {object} Profile summary
   */
  getSummary() {
    if (!this.profile) return null;

    return {
      cognitive: this.profile.cognitive,
      communication: this.profile.communication,
      languages: this.profile.tooling.primaryLanguages,
      domains: this.profile.domain.primaryDomains,
      expertise: this.profile.domain.expertiseAreas,
      industry: this.profile.domain.industryContext,
      quality: this.profile.quality,
      sessionsCount: this.profile.interactions.totalSessions,
      patternsCount: this.profile.patterns.length,
    };
  }
}

module.exports = {
  ProfileManager,
  DEFAULT_PROFILE,
};
