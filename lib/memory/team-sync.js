'use strict';

const fs = require('fs');
const { GlobalMemory } = require('./global-memory');
const { PatternAggregator } = require('./pattern-aggregator');

/**
 * Export format version
 */
const EXPORT_VERSION = '1.0.0';

/**
 * Conflict resolution strategies
 */
const CONFLICT_STRATEGIES = {
  MAJORITY: 'majority', // Use pattern with most support
  HIGHEST_CONFIDENCE: 'highest_confidence', // Use highest confidence pattern
  NEWEST: 'newest', // Use most recently updated
  MERGE_ALL: 'merge_all', // Keep all patterns
};

/**
 * TeamSync - Export/import for team pattern sharing
 *
 * Enables teams to share learned patterns, preferences, and
 * expertise across multiple developers.
 *
 * @example
 * const sync = new TeamSync();
 *
 * // Export team data
 * const teamData = sync.exportForTeam('engineering');
 * fs.writeFileSync('team-patterns.json', JSON.stringify(teamData));
 *
 * // Import team data
 * sync.importFromTeam(teamData, { strategy: 'majority' });
 */
class TeamSync {
  /**
   * @param {GlobalMemory} [globalMemory] - Optional global memory instance
   */
  constructor(globalMemory = null) {
    this.globalMemory = globalMemory || new GlobalMemory();
    this.aggregator = null;
  }

  /**
   * Get or create pattern aggregator
   * @private
   */
  _getAggregator() {
    if (!this.aggregator) {
      this.aggregator = new PatternAggregator(this.globalMemory);
    }
    return this.aggregator;
  }

  // ==================== EXPORT ====================

  /**
   * Export global memory for team sharing
   * @param {string} teamName - Name of the team
   * @param {object} [options] - Export options
   * @param {number} [options.minConfidence=0.5] - Minimum confidence to include
   * @param {boolean} [options.includeExpertise=true] - Include expertise
   * @param {boolean} [options.includePreferences=true] - Include preferences
   * @param {boolean} [options.includeProjects=false] - Include project list
   * @returns {object} Exportable team data
   */
  exportForTeam(teamName, options = {}) {
    const {
      minConfidence = 0.5,
      includeExpertise = true,
      includePreferences = true,
      includeProjects = false,
    } = options;

    this.globalMemory.init();

    // Filter patterns by confidence
    const patterns = this.globalMemory.patterns
      .filter(p => (p.confidence || 0.5) >= minConfidence)
      .map(p => ({
        type: p.type,
        pattern: p.pattern,
        confidence: p.confidence,
        occurrences: p.occurrences || 1,
        sources: p.sources || [],
      }));

    const exportData = {
      version: EXPORT_VERSION,
      teamName,
      exportedAt: new Date().toISOString(),
      exportedBy: process.env.USER || process.env.USERNAME || 'unknown',
      patterns,
      patternCount: patterns.length,
    };

    if (includeExpertise) {
      exportData.expertise = { ...this.globalMemory.expertise };
    }

    if (includePreferences) {
      exportData.preferences = this.globalMemory.getAllPreferences();
    }

    if (includeProjects) {
      exportData.projects = this.globalMemory.projects.map(p => ({
        name: p.name,
        path: p.path,
        languages: p.metadata?.languages || [],
      }));
    }

    // Calculate stats
    exportData.stats = {
      uniquePatternTypes: [...new Set(patterns.map(p => p.type))].length,
      totalSources: [...new Set(patterns.flatMap(p => p.sources))].length,
      expertiseAreas: includeExpertise ? Object.keys(exportData.expertise).length : 0,
    };

    return exportData;
  }

  /**
   * Export only high-confidence consensus patterns
   * @param {string} teamName - Team name
   * @returns {object} Consensus patterns export
   */
  exportConsensusPatterns(teamName) {
    this.globalMemory.init();
    const aggregator = this._getAggregator();
    aggregator.init();

    const consensus = aggregator.getConsensusPatterns('moderate');

    return {
      version: EXPORT_VERSION,
      teamName,
      exportedAt: new Date().toISOString(),
      type: 'consensus',
      patterns: consensus.map(p => ({
        type: p.type,
        pattern: p.pattern,
        confidence: p.confidence,
        consensusLevel: p.consensusLevel,
        projectCount: p.projectCount,
      })),
      patternCount: consensus.length,
    };
  }

  // ==================== IMPORT ====================

  /**
   * Import team data into global memory
   * @param {object} teamData - Data exported from exportForTeam
   * @param {object} [options] - Import options
   * @param {string} [options.strategy='majority'] - Conflict resolution strategy
   * @param {number} [options.confidenceBoost=0.1] - Boost for team patterns
   * @param {boolean} [options.preserveLocal=true] - Keep local patterns
   * @returns {object} Import summary
   */
  importFromTeam(teamData, options = {}) {
    const {
      strategy = CONFLICT_STRATEGIES.MAJORITY,
      confidenceBoost = 0.1,
      preserveLocal = true,
    } = options;

    if (!teamData || !teamData.patterns) {
      return { success: false, error: 'Invalid team data' };
    }

    this.globalMemory.init();

    const summary = {
      patternsImported: 0,
      patternsSkipped: 0,
      conflictsResolved: 0,
      expertiseImported: 0,
      preferencesImported: 0,
    };

    // Import patterns
    for (const pattern of teamData.patterns) {
      const existing = this.globalMemory.patterns.find(
        p => p.type === pattern.type && p.pattern === pattern.pattern,
      );

      if (existing) {
        // Resolve conflict
        const resolved = this._resolveConflict(existing, pattern, strategy);
        if (resolved !== existing) {
          Object.assign(existing, resolved);
          summary.conflictsResolved++;
        } else {
          summary.patternsSkipped++;
        }
      } else {
        // Add new pattern with team boost
        this.globalMemory.recordPattern({
          type: pattern.type,
          pattern: pattern.pattern,
          confidence: Math.min(0.99, (pattern.confidence || 0.5) + confidenceBoost),
          source: teamData.teamName || 'team',
        });
        summary.patternsImported++;
      }
    }

    // Import expertise
    if (teamData.expertise) {
      for (const [domain, data] of Object.entries(teamData.expertise)) {
        const level = typeof data === 'number' ? data : data.level;
        if (level) {
          this.globalMemory.addExpertise(domain, level);
          summary.expertiseImported++;
        }
      }
    }

    // Import preferences (only if not already set locally)
    if (teamData.preferences && !preserveLocal) {
      for (const [key, value] of Object.entries(teamData.preferences)) {
        if (!this.globalMemory.getPreference(key)) {
          this.globalMemory.setPreference(key, value);
          summary.preferencesImported++;
        }
      }
    }

    return { success: true, summary };
  }

  /**
   * Resolve a conflict between local and team patterns
   * @private
   */
  _resolveConflict(local, team, strategy) {
    switch (strategy) {
      case CONFLICT_STRATEGIES.HIGHEST_CONFIDENCE:
        return (team.confidence || 0.5) > (local.confidence || 0.5) ? team : local;

      case CONFLICT_STRATEGIES.NEWEST:
        const localDate = local.lastSeen ? new Date(local.lastSeen) : new Date(0);
        const teamDate = team.exportedAt ? new Date(team.exportedAt) : new Date(0);
        return teamDate > localDate ? team : local;

      case CONFLICT_STRATEGIES.MERGE_ALL:
        // Merge sources and boost confidence
        return {
          ...local,
          confidence: Math.min(0.99, Math.max(local.confidence || 0.5, team.confidence || 0.5) + 0.05),
          sources: [...new Set([...(local.sources || []), ...(team.sources || [])])],
          occurrences: (local.occurrences || 1) + (team.occurrences || 1),
        };

      case CONFLICT_STRATEGIES.MAJORITY:
      default:
        // Prefer the one with more sources/occurrences
        const localWeight = (local.sources?.length || 0) + (local.occurrences || 1);
        const teamWeight = (team.sources?.length || 0) + (team.occurrences || 1);
        return teamWeight > localWeight ? team : local;
    }
  }

  // ==================== TEAM AGGREGATION ====================

  /**
   * Merge multiple team exports into one
   * @param {Array<object>} teamExports - Array of team export data
   * @returns {object} Merged team data
   */
  mergeTeamExports(teamExports) {
    if (!teamExports || teamExports.length === 0) {
      return { success: false, error: 'No team data provided' };
    }

    const merged = {
      version: EXPORT_VERSION,
      teamName: 'merged',
      exportedAt: new Date().toISOString(),
      patterns: [],
      expertise: {},
      preferences: {},
      sourceTeams: [],
    };

    // Aggregate patterns
    const patternMap = new Map();

    for (const teamData of teamExports) {
      if (!teamData || !teamData.patterns) continue;

      merged.sourceTeams.push(teamData.teamName || 'unknown');

      for (const pattern of teamData.patterns) {
        const key = `${pattern.type}::${pattern.pattern}`;

        if (patternMap.has(key)) {
          const existing = patternMap.get(key);
          existing.confidence = Math.max(existing.confidence, pattern.confidence || 0.5);
          existing.occurrences += pattern.occurrences || 1;
          existing.teams.add(teamData.teamName || 'unknown');
        } else {
          patternMap.set(key, {
            type: pattern.type,
            pattern: pattern.pattern,
            confidence: pattern.confidence || 0.5,
            occurrences: pattern.occurrences || 1,
            teams: new Set([teamData.teamName || 'unknown']),
          });
        }
      }

      // Merge expertise
      if (teamData.expertise) {
        for (const [domain, data] of Object.entries(teamData.expertise)) {
          const level = typeof data === 'number' ? data : data.level;
          if (level) {
            if (!merged.expertise[domain]) {
              merged.expertise[domain] = { level: 0, count: 0 };
            }
            merged.expertise[domain].level += level;
            merged.expertise[domain].count += 1;
          }
        }
      }

      // Merge preferences (first wins)
      if (teamData.preferences) {
        for (const [key, value] of Object.entries(teamData.preferences)) {
          if (!merged.preferences[key]) {
            merged.preferences[key] = value;
          }
        }
      }
    }

    // Finalize patterns
    merged.patterns = Array.from(patternMap.values()).map(p => ({
      type: p.type,
      pattern: p.pattern,
      confidence: p.confidence,
      occurrences: p.occurrences,
      teamCount: p.teams.size,
    }));

    // Average expertise levels
    for (const domain of Object.keys(merged.expertise)) {
      const data = merged.expertise[domain];
      merged.expertise[domain] = {
        level: data.level / data.count,
        teamCount: data.count,
      };
    }

    merged.patternCount = merged.patterns.length;
    merged.stats = {
      teamsIncluded: merged.sourceTeams.length,
      totalPatterns: merged.patterns.length,
      crossTeamPatterns: merged.patterns.filter(p => p.teamCount > 1).length,
    };

    return merged;
  }

  /**
   * Get recommendations based on team patterns
   * @param {object} teamData - Team export data
   * @returns {object} Recommendations
   */
  getTeamRecommendations(teamData) {
    if (!teamData || !teamData.patterns) {
      return { error: 'Invalid team data' };
    }

    const recommendations = {};
    const typeMap = new Map();

    // Group by type
    for (const pattern of teamData.patterns) {
      if (!typeMap.has(pattern.type)) {
        typeMap.set(pattern.type, []);
      }
      typeMap.get(pattern.type).push(pattern);
    }

    // Get top pattern per type
    for (const [type, patterns] of typeMap) {
      patterns.sort((a, b) => (b.confidence || 0.5) - (a.confidence || 0.5));
      const top = patterns[0];

      recommendations[type] = {
        recommended: top.pattern,
        confidence: top.confidence,
        alternatives: patterns.slice(1, 3).map(p => p.pattern),
        teamSupport: top.teamCount || top.occurrences || 1,
      };
    }

    return {
      teamName: teamData.teamName,
      generatedAt: new Date().toISOString(),
      recommendations,
      recommendationCount: Object.keys(recommendations).length,
    };
  }

  // ==================== FILE OPERATIONS ====================

  /**
   * Export team data to file
   * @param {string} filePath - File path to write
   * @param {string} teamName - Team name
   * @param {object} [options] - Export options
   */
  exportToFile(filePath, teamName, options = {}) {
    const data = this.exportForTeam(teamName, options);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true, path: filePath, patternCount: data.patternCount };
  }

  /**
   * Import team data from file
   * @param {string} filePath - File path to read
   * @param {object} [options] - Import options
   * @returns {object} Import summary
   */
  importFromFile(filePath, options = {}) {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return this.importFromTeam(data, options);
    } catch (err) {
      return { success: false, error: `Failed to parse file: ${err.message}` };
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Validate team export data
   * @param {object} data - Data to validate
   * @returns {object} Validation result
   */
  validateExport(data) {
    const errors = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return { valid: false, errors };
    }

    if (!data.version) {
      errors.push('Missing version field');
    }

    if (!data.patterns || !Array.isArray(data.patterns)) {
      errors.push('Missing or invalid patterns array');
    } else {
      for (let i = 0; i < data.patterns.length; i++) {
        const p = data.patterns[i];
        if (!p.type) errors.push(`Pattern ${i} missing type`);
        if (!p.pattern) errors.push(`Pattern ${i} missing pattern value`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      version: data.version,
      patternCount: data.patterns?.length || 0,
    };
  }

  /**
   * Get sync statistics
   * @returns {object} Statistics
   */
  getStats() {
    this.globalMemory.init();

    return {
      localPatterns: this.globalMemory.patterns.length,
      localExpertise: Object.keys(this.globalMemory.expertise).length,
      localProjects: this.globalMemory.projects.length,
    };
  }
}

module.exports = {
  TeamSync,
  CONFLICT_STRATEGIES,
  EXPORT_VERSION,
};
