'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Storage locations for global memory
 */
const GLOBAL_DIR = path.join(os.homedir(), '.gywd', 'global');
const PATTERNS_FILE = path.join(GLOBAL_DIR, 'patterns.json');
const EXPERTISE_FILE = path.join(GLOBAL_DIR, 'expertise.json');
const PREFERENCES_FILE = path.join(GLOBAL_DIR, 'preferences.json');
const PROJECTS_FILE = path.join(GLOBAL_DIR, 'projects.json');

/**
 * GlobalMemory - Cross-project pattern persistence
 *
 * Stores learned patterns, expertise, and preferences in a user-wide
 * location (~/.gywd/global/) that persists across all projects.
 *
 * @example
 * const memory = new GlobalMemory();
 * memory.init();
 * memory.recordPattern({ type: 'naming', pattern: 'camelCase', confidence: 0.9 });
 * memory.addExpertise('backend', 0.8);
 */
class GlobalMemory {
  constructor() {
    this.patterns = [];
    this.expertise = {};
    this.preferences = {};
    this.projects = [];
    this.initialized = false;

    // Batching support
    this._pendingWrite = false;
    this._writeTimeout = null;
    this._batchWindowMs = 100;
  }

  /**
   * Initialize global memory, creating directories and loading existing data
   * @returns {GlobalMemory} this instance for chaining
   */
  init() {
    this._ensureDirectories();
    this._loadAll();
    this.initialized = true;
    return this;
  }

  /**
   * Ensure global directories exist
   * @private
   */
  _ensureDirectories() {
    if (!fs.existsSync(GLOBAL_DIR)) {
      fs.mkdirSync(GLOBAL_DIR, { recursive: true });
    }
  }

  /**
   * Load all global data from files
   * @private
   */
  _loadAll() {
    this.patterns = this._loadFile(PATTERNS_FILE, []);
    this.expertise = this._loadFile(EXPERTISE_FILE, {});
    this.preferences = this._loadFile(PREFERENCES_FILE, {});
    this.projects = this._loadFile(PROJECTS_FILE, []);
  }

  /**
   * Load a JSON file safely
   * @private
   * @param {string} filePath - Path to file
   * @param {*} defaultValue - Default value if file doesn't exist
   * @returns {*} Parsed JSON or default value
   */
  _loadFile(filePath, defaultValue) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (err) {
      // Return default on error
    }
    return defaultValue;
  }

  /**
   * Save a JSON file
   * @private
   * @param {string} filePath - Path to file
   * @param {*} data - Data to save
   */
  _saveFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Save all global data to files (batched/debounced)
   * Multiple rapid calls within _batchWindowMs will result in a single write
   * If _batchWindowMs is 0, writes are synchronous (useful for tests)
   */
  save() {
    // Synchronous mode when batch window is 0
    if (this._batchWindowMs === 0) {
      this._doWrite();
      return;
    }

    // If a write is already scheduled, don't schedule another
    if (this._writeTimeout) return;

    this._pendingWrite = true;
    this._writeTimeout = setTimeout(() => {
      this._doWrite();
      this._writeTimeout = null;
      this._pendingWrite = false;
    }, this._batchWindowMs);
  }

  /**
   * Force an immediate write, bypassing the batch window
   * Use when you need to ensure data is persisted (e.g., before process exit)
   */
  flush() {
    if (this._writeTimeout) {
      clearTimeout(this._writeTimeout);
      this._writeTimeout = null;
    }
    if (this._pendingWrite) {
      this._doWrite();
      this._pendingWrite = false;
    }
  }

  /**
   * Perform the actual write to disk
   * @private
   */
  _doWrite() {
    this._ensureDirectories();
    this._saveFile(PATTERNS_FILE, this.patterns);
    this._saveFile(EXPERTISE_FILE, this.expertise);
    this._saveFile(PREFERENCES_FILE, this.preferences);
    this._saveFile(PROJECTS_FILE, this.projects);
  }

  /**
   * Check if there's a pending write
   * @returns {boolean} True if a write is pending
   */
  hasPendingWrite() {
    return this._pendingWrite;
  }

  /**
   * Get the batch window in milliseconds
   * @returns {number} Batch window in ms
   */
  getBatchWindow() {
    return this._batchWindowMs;
  }

  /**
   * Set the batch window in milliseconds
   * @param {number} ms - New batch window
   */
  setBatchWindow(ms) {
    this._batchWindowMs = Math.max(0, ms);
  }

  // ==================== PATTERNS ====================

  /**
   * Record a learned pattern to global memory
   * @param {object} pattern - Pattern object
   * @param {string} pattern.type - Pattern type (naming, structure, async, etc.)
   * @param {string} pattern.pattern - The actual pattern value
   * @param {number} [pattern.confidence=0.5] - Confidence level 0-1
   * @param {string} [pattern.source] - Source project or context
   */
  recordPattern(pattern) {
    if (!this.initialized) this.init();

    const existing = this.patterns.find(
      p => p.type === pattern.type && p.pattern === pattern.pattern,
    );

    if (existing) {
      // Reinforce existing pattern
      existing.occurrences = (existing.occurrences || 1) + 1;
      existing.confidence = Math.min(1, (existing.confidence || 0.5) + 0.1);
      existing.lastSeen = new Date().toISOString();
      if (pattern.source && !existing.sources.includes(pattern.source)) {
        existing.sources.push(pattern.source);
      }
    } else {
      // Add new pattern
      this.patterns.push({
        id: `gp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: pattern.type,
        pattern: pattern.pattern,
        confidence: pattern.confidence || 0.5,
        occurrences: 1,
        sources: pattern.source ? [pattern.source] : [],
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      });
    }

    this.save();
  }

  /**
   * Get patterns by type
   * @param {string} type - Pattern type to filter by
   * @returns {Array} Matching patterns sorted by confidence
   */
  getPatternsByType(type) {
    if (!this.initialized) this.init();
    return this.patterns
      .filter(p => p.type === type)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get the most confident pattern of a type
   * @param {string} type - Pattern type
   * @returns {object|null} Most confident pattern or null
   */
  getDominantPattern(type) {
    const patterns = this.getPatternsByType(type);
    return patterns.length > 0 ? patterns[0] : null;
  }

  /**
   * Get all patterns above a confidence threshold
   * @param {number} [minConfidence=0.7] - Minimum confidence
   * @returns {Array} High confidence patterns
   */
  getConfidentPatterns(minConfidence = 0.7) {
    if (!this.initialized) this.init();
    return this.patterns
      .filter(p => p.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  // ==================== EXPERTISE ====================

  /**
   * Add or update expertise area
   * @param {string} domain - Expertise domain (backend, frontend, devops, etc.)
   * @param {number} level - Expertise level 0-1
   */
  addExpertise(domain, level) {
    if (!this.initialized) this.init();

    const current = this.expertise[domain];
    if (current) {
      // Average with existing, weighted toward new observation
      this.expertise[domain] = {
        level: current.level * 0.7 + level * 0.3,
        observations: (current.observations || 1) + 1,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      this.expertise[domain] = {
        level,
        observations: 1,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
    }

    this.save();
  }

  /**
   * Get expertise level for a domain
   * @param {string} domain - Domain to check
   * @returns {number} Expertise level 0-1, or 0 if unknown
   */
  getExpertise(domain) {
    if (!this.initialized) this.init();
    return this.expertise[domain]?.level || 0;
  }

  /**
   * Get all expertise areas
   * @returns {object} All expertise with levels
   */
  getAllExpertise() {
    if (!this.initialized) this.init();
    return { ...this.expertise };
  }

  /**
   * Get top expertise areas
   * @param {number} [limit=5] - Number of areas to return
   * @returns {Array} Top expertise areas sorted by level
   */
  getTopExpertise(limit = 5) {
    if (!this.initialized) this.init();
    return Object.entries(this.expertise)
      .map(([domain, data]) => ({ domain, ...data }))
      .sort((a, b) => b.level - a.level)
      .slice(0, limit);
  }

  // ==================== PREFERENCES ====================

  /**
   * Set a preference
   * @param {string} key - Preference key
   * @param {*} value - Preference value
   */
  setPreference(key, value) {
    if (!this.initialized) this.init();
    this.preferences[key] = {
      value,
      updatedAt: new Date().toISOString(),
    };
    this.save();
  }

  /**
   * Get a preference
   * @param {string} key - Preference key
   * @param {*} [defaultValue] - Default if not set
   * @returns {*} Preference value or default
   */
  getPreference(key, defaultValue = null) {
    if (!this.initialized) this.init();
    return this.preferences[key]?.value ?? defaultValue;
  }

  /**
   * Get all preferences
   * @returns {object} All preferences
   */
  getAllPreferences() {
    if (!this.initialized) this.init();
    const result = {};
    for (const [key, data] of Object.entries(this.preferences)) {
      result[key] = data.value;
    }
    return result;
  }

  // ==================== PROJECTS ====================

  /**
   * Register a project with global memory
   * @param {string} projectPath - Absolute path to project
   * @param {object} [metadata] - Optional project metadata
   */
  registerProject(projectPath, metadata = {}) {
    if (!this.initialized) this.init();

    const existing = this.projects.find(p => p.path === projectPath);
    if (existing) {
      existing.lastAccessed = new Date().toISOString();
      existing.accessCount = (existing.accessCount || 1) + 1;
      Object.assign(existing.metadata, metadata);
    } else {
      this.projects.push({
        path: projectPath,
        name: metadata.name || path.basename(projectPath),
        metadata,
        registeredAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        accessCount: 1,
      });
    }

    this.save();
  }

  /**
   * Get all registered projects
   * @returns {Array} List of registered projects
   */
  getProjects() {
    if (!this.initialized) this.init();
    return [...this.projects];
  }

  /**
   * Get recently accessed projects
   * @param {number} [limit=10] - Number of projects to return
   * @returns {Array} Recent projects sorted by last access
   */
  getRecentProjects(limit = 10) {
    if (!this.initialized) this.init();
    return [...this.projects]
      .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed))
      .slice(0, limit);
  }

  // ==================== SYNC ====================

  /**
   * Import patterns from a local project profile
   * @param {object} localProfile - Local profile object
   * @param {string} projectPath - Project path for source tracking
   */
  importFromProfile(localProfile, projectPath) {
    if (!this.initialized) this.init();

    const projectName = path.basename(projectPath);

    // Import patterns
    if (localProfile.patterns && Array.isArray(localProfile.patterns)) {
      for (const pattern of localProfile.patterns) {
        this.recordPattern({
          type: pattern.type,
          pattern: pattern.description || pattern.pattern,
          confidence: 0.6, // Start with moderate confidence from import
          source: projectName,
        });
      }
    }

    // Import expertise
    if (localProfile.tooling?.primaryLanguages) {
      for (const lang of localProfile.tooling.primaryLanguages) {
        this.addExpertise(lang, 0.7);
      }
    }

    if (localProfile.expertise) {
      for (const area of localProfile.expertise) {
        if (typeof area === 'string') {
          this.addExpertise(area, 0.6);
        } else if (area.domain) {
          this.addExpertise(area.domain, area.level || 0.6);
        }
      }
    }

    // Register project
    this.registerProject(projectPath, {
      name: localProfile.name || projectName,
      languages: localProfile.tooling?.primaryLanguages || [],
    });
  }

  /**
   * Export global patterns to enhance a local profile
   * @param {object} localProfile - Local profile to enhance
   * @returns {object} Enhanced profile
   */
  exportToProfile(localProfile) {
    if (!this.initialized) this.init();

    const enhanced = { ...localProfile };

    // Add high-confidence global patterns
    const globalPatterns = this.getConfidentPatterns(0.7);
    if (!enhanced.globalPatterns) {
      enhanced.globalPatterns = [];
    }
    enhanced.globalPatterns = globalPatterns.map(p => ({
      type: p.type,
      pattern: p.pattern,
      confidence: p.confidence,
      fromProjects: p.sources.length,
    }));

    // Add global expertise hints
    const topExpertise = this.getTopExpertise(10);
    if (!enhanced.globalExpertise) {
      enhanced.globalExpertise = [];
    }
    enhanced.globalExpertise = topExpertise;

    // Add global preferences
    enhanced.globalPreferences = this.getAllPreferences();

    return enhanced;
  }

  // ==================== UTILITIES ====================

  /**
   * Clear all global memory (use with caution)
   */
  clear() {
    this.patterns = [];
    this.expertise = {};
    this.preferences = {};
    this.projects = [];
    this.save();
  }

  /**
   * Get memory statistics
   * @returns {object} Statistics about stored data
   */
  getStats() {
    if (!this.initialized) this.init();
    return {
      totalPatterns: this.patterns.length,
      patternTypes: [...new Set(this.patterns.map(p => p.type))],
      expertiseAreas: Object.keys(this.expertise).length,
      preferencesCount: Object.keys(this.preferences).length,
      projectsCount: this.projects.length,
      highConfidencePatterns: this.patterns.filter(p => p.confidence >= 0.7).length,
    };
  }

  /**
   * Get the global directory path
   * @returns {string} Path to global memory directory
   */
  static getGlobalDir() {
    return GLOBAL_DIR;
  }
}

module.exports = {
  GlobalMemory,
  GLOBAL_DIR,
  PATTERNS_FILE,
  EXPERTISE_FILE,
  PREFERENCES_FILE,
  PROJECTS_FILE,
};
