'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Feedback storage location
 */
const FEEDBACK_DIR = path.join(os.homedir(), '.gywd', 'feedback');
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'history.json');
const STATS_FILE = path.join(FEEDBACK_DIR, 'stats.json');

/**
 * Feedback types
 */
const FEEDBACK_TYPES = {
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  MODIFIED: 'modified',
  IGNORED: 'ignored',
};

/**
 * Suggestion categories
 */
const SUGGESTION_CATEGORIES = {
  PATTERN: 'pattern',
  CODE: 'code',
  QUESTION: 'question',
  PREDICTION: 'prediction',
  RECOMMENDATION: 'recommendation',
};

/**
 * FeedbackCollector - Tracks suggestion acceptance/rejection
 *
 * Learns from which suggestions were accepted, rejected, or modified
 * to improve future recommendations.
 *
 * @example
 * const collector = new FeedbackCollector();
 * collector.init();
 *
 * // Record a suggestion
 * const suggestionId = collector.recordSuggestion({
 *   category: 'pattern',
 *   type: 'naming',
 *   suggestion: 'camelCase',
 *   context: { file: 'src/utils.js' }
 * });
 *
 * // Later, record feedback
 * collector.recordFeedback(suggestionId, 'accepted');
 */
class FeedbackCollector {
  constructor() {
    this.history = [];
    this.stats = {
      total: 0,
      byCategory: {},
      byType: {},
      acceptanceRate: 0,
    };
    this.pendingSuggestions = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the feedback collector
   * @returns {FeedbackCollector} this for chaining
   */
  init() {
    this._ensureDirectories();
    this._loadData();
    this.initialized = true;
    return this;
  }

  /**
   * Ensure feedback directories exist
   * @private
   */
  _ensureDirectories() {
    if (!fs.existsSync(FEEDBACK_DIR)) {
      fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }
  }

  /**
   * Load existing feedback data
   * @private
   */
  _loadData() {
    this.history = this._loadFile(FEEDBACK_FILE, []);
    this.stats = this._loadFile(STATS_FILE, {
      total: 0,
      byCategory: {},
      byType: {},
      acceptanceRate: 0,
    });
  }

  /**
   * Load a JSON file safely
   * @private
   */
  _loadFile(filePath, defaultValue) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (err) {
      // Return default on error
    }
    return defaultValue;
  }

  /**
   * Save a JSON file
   * @private
   */
  _saveFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Save all data
   */
  save() {
    this._ensureDirectories();
    this._saveFile(FEEDBACK_FILE, this.history);
    this._saveFile(STATS_FILE, this.stats);
  }

  // ==================== SUGGESTION RECORDING ====================

  /**
   * Record a suggestion that was made
   * @param {object} suggestion - Suggestion details
   * @param {string} suggestion.category - Category (pattern, code, question, etc.)
   * @param {string} suggestion.type - Specific type within category
   * @param {string} suggestion.suggestion - The actual suggestion
   * @param {object} [suggestion.context] - Additional context
   * @param {number} [suggestion.confidence] - Confidence level 0-1
   * @returns {string} Suggestion ID for tracking
   */
  recordSuggestion(suggestion) {
    if (!this.initialized) this.init();

    const id = `sug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const record = {
      id,
      category: suggestion.category || 'unknown',
      type: suggestion.type || 'unknown',
      suggestion: suggestion.suggestion,
      context: suggestion.context || {},
      confidence: suggestion.confidence || 0.5,
      createdAt: new Date().toISOString(),
      feedback: null,
      feedbackAt: null,
    };

    this.pendingSuggestions.set(id, record);
    return id;
  }

  /**
   * Record feedback for a suggestion
   * @param {string} suggestionId - The suggestion ID
   * @param {string} feedback - Feedback type (accepted, rejected, modified, ignored)
   * @param {object} [details] - Additional feedback details
   * @returns {boolean} Whether feedback was recorded
   */
  recordFeedback(suggestionId, feedback, details = {}) {
    if (!this.initialized) this.init();

    const suggestion = this.pendingSuggestions.get(suggestionId);
    if (!suggestion) {
      // Try to find in history
      const existing = this.history.find(h => h.id === suggestionId);
      if (existing && !existing.feedback) {
        existing.feedback = feedback;
        existing.feedbackAt = new Date().toISOString();
        existing.feedbackDetails = details;
        this._updateStats(existing);
        this.save();
        return true;
      }
      return false;
    }

    suggestion.feedback = feedback;
    suggestion.feedbackAt = new Date().toISOString();
    suggestion.feedbackDetails = details;

    // Move to history
    this.history.push(suggestion);
    this.pendingSuggestions.delete(suggestionId);

    // Update statistics
    this._updateStats(suggestion);
    this.save();

    return true;
  }

  /**
   * Record quick feedback without prior suggestion tracking
   * @param {object} feedback - Feedback details
   * @returns {string} Feedback ID
   */
  recordQuickFeedback(feedback) {
    if (!this.initialized) this.init();

    const id = `fb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const record = {
      id,
      category: feedback.category || 'unknown',
      type: feedback.type || 'unknown',
      suggestion: feedback.suggestion || '',
      context: feedback.context || {},
      confidence: feedback.confidence || 0.5,
      createdAt: new Date().toISOString(),
      feedback: feedback.feedback || FEEDBACK_TYPES.ACCEPTED,
      feedbackAt: new Date().toISOString(),
      feedbackDetails: feedback.details || {},
    };

    this.history.push(record);
    this._updateStats(record);
    this.save();

    return id;
  }

  /**
   * Update statistics based on feedback
   * @private
   */
  _updateStats(record) {
    this.stats.total++;

    // Update by category
    if (!this.stats.byCategory[record.category]) {
      this.stats.byCategory[record.category] = {
        total: 0,
        accepted: 0,
        rejected: 0,
        modified: 0,
        ignored: 0,
      };
    }
    this.stats.byCategory[record.category].total++;
    this.stats.byCategory[record.category][record.feedback] =
      (this.stats.byCategory[record.category][record.feedback] || 0) + 1;

    // Update by type
    const typeKey = `${record.category}:${record.type}`;
    if (!this.stats.byType[typeKey]) {
      this.stats.byType[typeKey] = {
        total: 0,
        accepted: 0,
        rejected: 0,
        modified: 0,
        ignored: 0,
      };
    }
    this.stats.byType[typeKey].total++;
    this.stats.byType[typeKey][record.feedback] =
      (this.stats.byType[typeKey][record.feedback] || 0) + 1;

    // Calculate overall acceptance rate
    const accepted = this.history.filter(
      h => h.feedback === FEEDBACK_TYPES.ACCEPTED,
    ).length;
    this.stats.acceptanceRate = this.stats.total > 0
      ? accepted / this.stats.total
      : 0;
  }

  // ==================== QUERY METHODS ====================

  /**
   * Get acceptance rate for a category
   * @param {string} category - Category to check
   * @returns {number} Acceptance rate 0-1
   */
  getAcceptanceRate(category) {
    if (!this.initialized) this.init();

    const catStats = this.stats.byCategory[category];
    if (!catStats || catStats.total === 0) return 0.5; // Default

    return catStats.accepted / catStats.total;
  }

  /**
   * Get acceptance rate for a specific type
   * @param {string} category - Category
   * @param {string} type - Type within category
   * @returns {number} Acceptance rate 0-1
   */
  getTypeAcceptanceRate(category, type) {
    if (!this.initialized) this.init();

    const typeKey = `${category}:${type}`;
    const typeStats = this.stats.byType[typeKey];
    if (!typeStats || typeStats.total === 0) return 0.5; // Default

    return typeStats.accepted / typeStats.total;
  }

  /**
   * Get feedback history for a category
   * @param {string} category - Category to filter
   * @param {number} [limit=50] - Maximum records to return
   * @returns {Array} Feedback history
   */
  getHistory(category, limit = 50) {
    if (!this.initialized) this.init();

    return this.history
      .filter(h => !category || h.category === category)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get recent feedback
   * @param {number} [days=7] - Days to look back
   * @returns {Array} Recent feedback
   */
  getRecentFeedback(days = 7) {
    if (!this.initialized) this.init();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return this.history.filter(h => new Date(h.feedbackAt) >= cutoff);
  }

  /**
   * Get pending suggestions (no feedback yet)
   * @returns {Array} Pending suggestions
   */
  getPendingSuggestions() {
    if (!this.initialized) this.init();
    return Array.from(this.pendingSuggestions.values());
  }

  /**
   * Get low-performing suggestion types
   * @param {number} [threshold=0.3] - Acceptance rate threshold
   * @returns {Array} Types with low acceptance
   */
  getLowPerformingTypes(threshold = 0.3) {
    if (!this.initialized) this.init();

    const lowPerforming = [];

    for (const [typeKey, stats] of Object.entries(this.stats.byType)) {
      if (stats.total < 3) continue; // Need minimum data

      const rate = stats.accepted / stats.total;
      if (rate < threshold) {
        const [category, type] = typeKey.split(':');
        lowPerforming.push({
          category,
          type,
          acceptanceRate: rate,
          total: stats.total,
          rejected: stats.rejected,
        });
      }
    }

    return lowPerforming.sort((a, b) => a.acceptanceRate - b.acceptanceRate);
  }

  /**
   * Get high-performing suggestion types
   * @param {number} [threshold=0.7] - Acceptance rate threshold
   * @returns {Array} Types with high acceptance
   */
  getHighPerformingTypes(threshold = 0.7) {
    if (!this.initialized) this.init();

    const highPerforming = [];

    for (const [typeKey, stats] of Object.entries(this.stats.byType)) {
      if (stats.total < 3) continue; // Need minimum data

      const rate = stats.accepted / stats.total;
      if (rate >= threshold) {
        const [category, type] = typeKey.split(':');
        highPerforming.push({
          category,
          type,
          acceptanceRate: rate,
          total: stats.total,
          accepted: stats.accepted,
        });
      }
    }

    return highPerforming.sort((a, b) => b.acceptanceRate - a.acceptanceRate);
  }

  // ==================== CONFIDENCE ADJUSTMENT ====================

  /**
   * Get adjusted confidence based on historical feedback
   * @param {string} category - Suggestion category
   * @param {string} type - Suggestion type
   * @param {number} baseConfidence - Original confidence
   * @returns {number} Adjusted confidence
   */
  adjustConfidence(category, type, baseConfidence) {
    if (!this.initialized) this.init();

    const typeRate = this.getTypeAcceptanceRate(category, type);
    const categoryRate = this.getAcceptanceRate(category);

    // Blend base confidence with historical performance
    // Weight: 60% base, 25% type rate, 15% category rate
    const adjusted =
      baseConfidence * 0.6 +
      typeRate * 0.25 +
      categoryRate * 0.15;

    return Math.max(0.1, Math.min(0.99, adjusted));
  }

  /**
   * Should this type of suggestion be suppressed?
   * @param {string} category - Category
   * @param {string} type - Type
   * @param {number} [threshold=0.2] - Suppression threshold
   * @returns {boolean} Whether to suppress
   */
  shouldSuppress(category, type, threshold = 0.2) {
    if (!this.initialized) this.init();

    const typeKey = `${category}:${type}`;
    const stats = this.stats.byType[typeKey];

    if (!stats || stats.total < 5) return false; // Need more data

    const rate = stats.accepted / stats.total;
    return rate < threshold;
  }

  // ==================== UTILITIES ====================

  /**
   * Get overall statistics
   * @returns {object} Statistics
   */
  getStats() {
    if (!this.initialized) this.init();

    return {
      ...this.stats,
      historySize: this.history.length,
      pendingCount: this.pendingSuggestions.size,
      categoriesTracked: Object.keys(this.stats.byCategory).length,
      typesTracked: Object.keys(this.stats.byType).length,
    };
  }

  /**
   * Clear all feedback data
   */
  clear() {
    this.history = [];
    this.stats = {
      total: 0,
      byCategory: {},
      byType: {},
      acceptanceRate: 0,
    };
    this.pendingSuggestions.clear();
    this.save();
  }

  /**
   * Export feedback data
   * @returns {object} Exportable data
   */
  export() {
    if (!this.initialized) this.init();

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      history: this.history,
      stats: this.stats,
    };
  }

  /**
   * Import feedback data
   * @param {object} data - Data to import
   * @param {boolean} [merge=true] - Merge with existing or replace
   */
  import(data, merge = true) {
    if (!this.initialized) this.init();

    if (merge) {
      // Merge histories, avoiding duplicates by ID
      const existingIds = new Set(this.history.map(h => h.id));
      for (const record of (data.history || [])) {
        if (!existingIds.has(record.id)) {
          this.history.push(record);
          this._updateStats(record);
        }
      }
    } else {
      // Replace
      this.history = data.history || [];
      this.stats = data.stats || {
        total: 0,
        byCategory: {},
        byType: {},
        acceptanceRate: 0,
      };
    }

    this.save();
  }

  /**
   * Get feedback directory path
   * @returns {string} Directory path
   */
  static getFeedbackDir() {
    return FEEDBACK_DIR;
  }
}

module.exports = {
  FeedbackCollector,
  FEEDBACK_TYPES,
  SUGGESTION_CATEGORIES,
  FEEDBACK_DIR,
  FEEDBACK_FILE,
  STATS_FILE,
};
