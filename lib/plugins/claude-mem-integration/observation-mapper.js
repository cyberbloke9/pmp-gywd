'use strict';

/**
 * Observation Mapper for Claude-Mem Integration
 *
 * Maps claude-mem observations to GYWD pattern format.
 * Uses tool-level mapping for simplicity and reliability.
 *
 * @module observation-mapper
 */

/**
 * Tool to pattern type mapping
 */
const TOOL_TYPE_MAP = {
  // File operations
  'Read': 'tool:read',
  'Write': 'tool:write',
  'Edit': 'tool:edit',

  // Search operations
  'Grep': 'tool:search',
  'Glob': 'tool:search',

  // Shell operations
  'Bash': 'tool:bash',

  // Agent operations
  'Task': 'tool:agent',

  // Web operations
  'WebFetch': 'tool:web',
  'WebSearch': 'tool:web',

  // LSP operations
  'LSP': 'tool:lsp',

  // Notebook operations
  'NotebookEdit': 'tool:notebook',

  // Other
  'AskUserQuestion': 'tool:interaction',
  'Skill': 'tool:skill',
};

/**
 * Default pattern type for unknown tools
 */
const DEFAULT_TOOL_TYPE = 'tool:other';

/**
 * Observation Mapper
 * Transforms claude-mem observations to GYWD patterns
 */
class ObservationMapper {
  /**
   * Create observation mapper
   * @param {Object} options - Configuration options
   * @param {number} options.initialConfidence - Initial confidence for new patterns (default: 0.6)
   */
  constructor(options = {}) {
    this.initialConfidence = options.initialConfidence || 0.6;
    this.stats = {
      mapped: 0,
      skipped: 0,
      byType: {},
    };
  }

  /**
   * Map a claude-mem observation to a GYWD pattern
   * @param {Object} observation - Claude-mem observation
   * @returns {Object|null} - GYWD pattern or null if unmappable
   */
  toPattern(observation) {
    if (!observation || !observation.tool_name) {
      this.stats.skipped++;
      return null;
    }

    const toolName = observation.tool_name;
    const patternType = this._getPatternType(toolName);

    // Track stats
    this.stats.mapped++;
    this.stats.byType[patternType] = (this.stats.byType[patternType] || 0) + 1;

    return {
      id: this._generateId(),
      type: patternType,
      pattern: toolName,
      confidence: this.initialConfidence,
      occurrences: 1,
      sources: [observation.project || 'unknown'],
      createdAt: observation.created_at || new Date().toISOString(),
      lastSeen: observation.created_at || new Date().toISOString(),
      metadata: {
        source: 'claude-mem',
        observationId: observation.id,
        sessionId: observation.session_id || observation.sessionDbId,
      },
    };
  }

  /**
   * Map multiple observations to patterns
   * @param {Array} observations - Array of claude-mem observations
   * @returns {Array} - Array of GYWD patterns
   */
  toPatterns(observations) {
    if (!Array.isArray(observations)) {
      return [];
    }

    return observations
      .map(obs => this.toPattern(obs))
      .filter(pattern => pattern !== null);
  }

  /**
   * Aggregate patterns by tool type
   * Combines multiple observations of same tool into single pattern with higher occurrence count
   * @param {Array} patterns - Array of patterns
   * @returns {Array} - Aggregated patterns
   */
  aggregate(patterns) {
    const aggregated = new Map();

    for (const pattern of patterns) {
      const key = `${pattern.type}:${pattern.pattern}`;

      if (aggregated.has(key)) {
        const existing = aggregated.get(key);
        existing.occurrences += pattern.occurrences;
        existing.sources = [...new Set([...existing.sources, ...pattern.sources])];

        // Update lastSeen if newer
        if (pattern.lastSeen > existing.lastSeen) {
          existing.lastSeen = pattern.lastSeen;
        }

        // Boost confidence based on occurrences (capped at 0.95)
        existing.confidence = Math.min(
          existing.confidence + (0.05 * pattern.occurrences),
          0.95,
        );
      } else {
        aggregated.set(key, { ...pattern });
      }
    }

    return Array.from(aggregated.values());
  }

  /**
   * Get pattern type for a tool
   * @param {string} toolName - Claude Code tool name
   * @returns {string} - Pattern type
   * @private
   */
  _getPatternType(toolName) {
    return TOOL_TYPE_MAP[toolName] || DEFAULT_TOOL_TYPE;
  }

  /**
   * Generate unique pattern ID
   * @returns {string}
   * @private
   */
  _generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `cm-${timestamp}-${random}`;
  }

  /**
   * Check if a tool should be mapped
   * @param {string} toolName - Tool name
   * @returns {boolean}
   */
  shouldMap(toolName) {
    // Map all tools by default
    return typeof toolName === 'string' && toolName.length > 0;
  }

  /**
   * Get mapping statistics
   * @returns {Object}
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      mapped: 0,
      skipped: 0,
      byType: {},
    };
  }

  /**
   * Get supported tool types
   * @returns {Object}
   */
  static getToolTypeMap() {
    return { ...TOOL_TYPE_MAP };
  }

  /**
   * Get all pattern types
   * @returns {Array}
   */
  static getPatternTypes() {
    const types = new Set(Object.values(TOOL_TYPE_MAP));
    types.add(DEFAULT_TOOL_TYPE);
    return Array.from(types);
  }
}

module.exports = { ObservationMapper, TOOL_TYPE_MAP, DEFAULT_TOOL_TYPE };
