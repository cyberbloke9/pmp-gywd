'use strict';

const { GlobalMemory } = require('./global-memory');

/**
 * Consensus thresholds for pattern classification
 */
const CONSENSUS_THRESHOLDS = {
  STRONG: 0.8, // 80%+ of projects agree
  MODERATE: 0.5, // 50%+ of projects agree
  WEAK: 0.25, // 25%+ of projects agree
};

/**
 * Confidence boost factors
 */
const CONFIDENCE_FACTORS = {
  CROSS_PROJECT: 0.1, // Boost per additional project
  CONSENSUS: 0.2, // Boost for strong consensus
  RECENCY: 0.05, // Boost for recent patterns
  MAX_CONFIDENCE: 0.99, // Cap confidence
};

/**
 * PatternAggregator - Merges patterns from multiple projects
 *
 * Analyzes patterns across projects to identify:
 * - Consensus patterns (used consistently across projects)
 * - Outlier patterns (project-specific anomalies)
 * - Emerging patterns (new but growing in adoption)
 *
 * @example
 * const aggregator = new PatternAggregator();
 * const consensus = aggregator.getConsensusPatterns();
 * const unique = aggregator.getUniquePatterns('project-name');
 */
class PatternAggregator {
  /**
   * @param {GlobalMemory} [globalMemory] - Optional global memory instance
   */
  constructor(globalMemory = null) {
    this.globalMemory = globalMemory || new GlobalMemory();
    this.aggregatedPatterns = new Map();
    this.projectPatterns = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the aggregator by loading and analyzing global patterns
   * @returns {PatternAggregator} this for chaining
   */
  init() {
    this.globalMemory.init();
    this._analyzePatterns();
    this.initialized = true;
    return this;
  }

  /**
   * Analyze all patterns from global memory
   * @private
   */
  _analyzePatterns() {
    const patterns = this.globalMemory.patterns;
    const projects = this.globalMemory.projects;
    const totalProjects = Math.max(projects.length, 1);

    // Group patterns by type+pattern key
    const patternGroups = new Map();

    for (const pattern of patterns) {
      const key = `${pattern.type}::${pattern.pattern}`;

      if (!patternGroups.has(key)) {
        patternGroups.set(key, {
          type: pattern.type,
          pattern: pattern.pattern,
          instances: [],
          sources: new Set(),
        });
      }

      const group = patternGroups.get(key);
      group.instances.push(pattern);
      for (const source of (pattern.sources || [])) {
        group.sources.add(source);
      }
    }

    // Calculate aggregated statistics
    for (const [key, group] of patternGroups) {
      const projectCount = group.sources.size;
      const projectRatio = projectCount / totalProjects;

      // Calculate aggregate confidence
      const baseConfidence = this._calculateAggregateConfidence(group.instances);
      const crossProjectBoost = Math.min(
        (projectCount - 1) * CONFIDENCE_FACTORS.CROSS_PROJECT,
        0.3,
      );
      const consensusBoost = projectRatio >= CONSENSUS_THRESHOLDS.STRONG
        ? CONFIDENCE_FACTORS.CONSENSUS
        : 0;

      const aggregatedConfidence = Math.min(
        baseConfidence + crossProjectBoost + consensusBoost,
        CONFIDENCE_FACTORS.MAX_CONFIDENCE,
      );

      // Determine consensus level
      let consensusLevel = 'none';
      if (projectRatio >= CONSENSUS_THRESHOLDS.STRONG) {
        consensusLevel = 'strong';
      } else if (projectRatio >= CONSENSUS_THRESHOLDS.MODERATE) {
        consensusLevel = 'moderate';
      } else if (projectRatio >= CONSENSUS_THRESHOLDS.WEAK) {
        consensusLevel = 'weak';
      }

      this.aggregatedPatterns.set(key, {
        type: group.type,
        pattern: group.pattern,
        confidence: aggregatedConfidence,
        projectCount,
        projectRatio,
        consensusLevel,
        sources: Array.from(group.sources),
        totalOccurrences: group.instances.reduce(
          (sum, p) => sum + (p.occurrences || 1),
          0,
        ),
        isConsensus: projectRatio >= CONSENSUS_THRESHOLDS.MODERATE,
        isOutlier: projectCount === 1 && totalProjects > 1,
      });
    }

    // Build per-project pattern index
    for (const project of projects) {
      const projectName = project.name || project.path;
      this.projectPatterns.set(projectName, new Set());
    }

    for (const [key, agg] of this.aggregatedPatterns) {
      for (const source of agg.sources) {
        if (this.projectPatterns.has(source)) {
          this.projectPatterns.get(source).add(key);
        }
      }
    }
  }

  /**
   * Calculate aggregate confidence from multiple pattern instances
   * @private
   * @param {Array} instances - Pattern instances
   * @returns {number} Aggregate confidence 0-1
   */
  _calculateAggregateConfidence(instances) {
    if (instances.length === 0) return 0;

    // Weighted average, with higher weight for more recent patterns
    let totalWeight = 0;
    let weightedSum = 0;

    for (const instance of instances) {
      const recency = this._calculateRecencyWeight(instance.lastSeen);
      const weight = (instance.occurrences || 1) * recency;
      weightedSum += (instance.confidence || 0.5) * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Calculate recency weight for a pattern
   * @private
   * @param {string} lastSeen - ISO date string
   * @returns {number} Recency weight 0.5-1.0
   */
  _calculateRecencyWeight(lastSeen) {
    if (!lastSeen) return 0.5;

    const now = Date.now();
    const seen = new Date(lastSeen).getTime();
    const daysSince = (now - seen) / (1000 * 60 * 60 * 24);

    // Decay over 30 days from 1.0 to 0.5
    return Math.max(0.5, 1 - (daysSince / 60));
  }

  // ==================== QUERY METHODS ====================

  /**
   * Get consensus patterns (used across multiple projects)
   * @param {string} [level='moderate'] - Minimum consensus level
   * @returns {Array} Consensus patterns sorted by confidence
   */
  getConsensusPatterns(level = 'moderate') {
    if (!this.initialized) this.init();

    const threshold = CONSENSUS_THRESHOLDS[level.toUpperCase()] ||
      CONSENSUS_THRESHOLDS.MODERATE;

    return Array.from(this.aggregatedPatterns.values())
      .filter(p => p.projectRatio >= threshold)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get outlier patterns (unique to single project)
   * @returns {Array} Outlier patterns
   */
  getOutlierPatterns() {
    if (!this.initialized) this.init();

    return Array.from(this.aggregatedPatterns.values())
      .filter(p => p.isOutlier)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get patterns unique to a specific project
   * @param {string} projectName - Project name
   * @returns {Array} Unique patterns for this project
   */
  getUniquePatterns(projectName) {
    if (!this.initialized) this.init();

    const projectKeys = this.projectPatterns.get(projectName);
    if (!projectKeys) return [];

    return Array.from(projectKeys)
      .map(key => this.aggregatedPatterns.get(key))
      .filter(p => p && p.isOutlier)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get common patterns between two or more projects
   * @param {Array<string>} projectNames - Project names to compare
   * @returns {Array} Common patterns
   */
  getCommonPatterns(projectNames) {
    if (!this.initialized) this.init();

    const patternSets = projectNames
      .map(name => this.projectPatterns.get(name))
      .filter(set => set);

    if (patternSets.length < 2) return [];

    // Find intersection
    const intersection = new Set(patternSets[0]);
    for (let i = 1; i < patternSets.length; i++) {
      for (const key of intersection) {
        if (!patternSets[i].has(key)) {
          intersection.delete(key);
        }
      }
    }

    return Array.from(intersection)
      .map(key => this.aggregatedPatterns.get(key))
      .filter(Boolean)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get patterns by type
   * @param {string} type - Pattern type
   * @returns {Array} Patterns of this type
   */
  getPatternsByType(type) {
    if (!this.initialized) this.init();

    return Array.from(this.aggregatedPatterns.values())
      .filter(p => p.type === type)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get the dominant pattern for a type
   * @param {string} type - Pattern type
   * @returns {object|null} Most confident pattern or null
   */
  getDominantPattern(type) {
    const patterns = this.getPatternsByType(type);
    return patterns.length > 0 ? patterns[0] : null;
  }

  /**
   * Get emerging patterns (new but appearing in multiple projects)
   * @param {number} [minProjects=2] - Minimum projects
   * @param {number} [maxDays=30] - Maximum age in days
   * @returns {Array} Emerging patterns
   */
  getEmergingPatterns(minProjects = 2, maxDays = 30) {
    if (!this.initialized) this.init();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxDays);

    return Array.from(this.aggregatedPatterns.values())
      .filter(p => {
        // Check project count
        if (p.projectCount < minProjects) return false;

        // Check recency - at least one instance must be recent
        const recentInstances = this.globalMemory.patterns.filter(gp => {
          const key = `${gp.type}::${gp.pattern}`;
          if (key !== `${p.type}::${p.pattern}`) return false;
          if (!gp.createdAt) return false;
          return new Date(gp.createdAt) >= cutoff;
        });

        return recentInstances.length > 0;
      })
      .sort((a, b) => b.projectCount - a.projectCount);
  }

  // ==================== ANALYSIS METHODS ====================

  /**
   * Analyze pattern diversity across projects
   * @returns {object} Diversity analysis
   */
  analyzePatternDiversity() {
    if (!this.initialized) this.init();

    const types = new Map();
    for (const [, pattern] of this.aggregatedPatterns) {
      if (!types.has(pattern.type)) {
        types.set(pattern.type, { variations: [], consensus: null });
      }
      types.get(pattern.type).variations.push(pattern);
    }

    const analysis = {
      totalPatternTypes: types.size,
      typesWithConsensus: 0,
      typesWithoutConsensus: 0,
      typeAnalysis: {},
    };

    for (const [type, data] of types) {
      const sorted = data.variations.sort((a, b) => b.confidence - a.confidence);
      const dominant = sorted[0];
      const hasConsensus = dominant && dominant.isConsensus;

      if (hasConsensus) {
        analysis.typesWithConsensus++;
      } else {
        analysis.typesWithoutConsensus++;
      }

      analysis.typeAnalysis[type] = {
        variationCount: data.variations.length,
        hasConsensus,
        dominant: dominant ? dominant.pattern : null,
        dominantConfidence: dominant ? dominant.confidence : 0,
        alternatives: sorted.slice(1).map(p => ({
          pattern: p.pattern,
          confidence: p.confidence,
        })),
      };
    }

    return analysis;
  }

  /**
   * Get recommendations for a new project based on consensus
   * @returns {object} Recommended patterns by type
   */
  getRecommendations() {
    if (!this.initialized) this.init();

    const recommendations = {};
    const types = new Set(
      Array.from(this.aggregatedPatterns.values()).map(p => p.type),
    );

    for (const type of types) {
      const dominant = this.getDominantPattern(type);
      if (dominant && dominant.confidence >= 0.6) {
        recommendations[type] = {
          recommended: dominant.pattern,
          confidence: dominant.confidence,
          adoptedBy: dominant.projectCount,
          consensusLevel: dominant.consensusLevel,
        };
      }
    }

    return recommendations;
  }

  /**
   * Compare patterns between two projects
   * @param {string} project1 - First project name
   * @param {string} project2 - Second project name
   * @returns {object} Comparison analysis
   */
  compareProjects(project1, project2) {
    if (!this.initialized) this.init();

    const patterns1 = this.projectPatterns.get(project1) || new Set();
    const patterns2 = this.projectPatterns.get(project2) || new Set();

    const common = new Set();
    const onlyIn1 = new Set();
    const onlyIn2 = new Set();

    for (const key of patterns1) {
      if (patterns2.has(key)) {
        common.add(key);
      } else {
        onlyIn1.add(key);
      }
    }

    for (const key of patterns2) {
      if (!patterns1.has(key)) {
        onlyIn2.add(key);
      }
    }

    const getPatternDetails = (keys) => Array.from(keys)
      .map(key => this.aggregatedPatterns.get(key))
      .filter(Boolean)
      .map(p => ({ type: p.type, pattern: p.pattern, confidence: p.confidence }));

    return {
      project1,
      project2,
      similarity: patterns1.size + patterns2.size > 0
        ? (common.size * 2) / (patterns1.size + patterns2.size)
        : 0,
      common: getPatternDetails(common),
      onlyInFirst: getPatternDetails(onlyIn1),
      onlyInSecond: getPatternDetails(onlyIn2),
    };
  }

  // ==================== UTILITIES ====================

  /**
   * Get aggregator statistics
   * @returns {object} Statistics
   */
  getStats() {
    if (!this.initialized) this.init();

    const patterns = Array.from(this.aggregatedPatterns.values());

    return {
      totalAggregatedPatterns: patterns.length,
      consensusPatterns: patterns.filter(p => p.isConsensus).length,
      outlierPatterns: patterns.filter(p => p.isOutlier).length,
      strongConsensus: patterns.filter(
        p => p.consensusLevel === 'strong',
      ).length,
      moderateConsensus: patterns.filter(
        p => p.consensusLevel === 'moderate',
      ).length,
      trackedProjects: this.projectPatterns.size,
      patternTypes: [...new Set(patterns.map(p => p.type))],
    };
  }

  /**
   * Refresh aggregation from global memory
   */
  refresh() {
    this.aggregatedPatterns.clear();
    this.projectPatterns.clear();
    this.globalMemory.init();
    this._analyzePatterns();
  }
}

module.exports = {
  PatternAggregator,
  CONSENSUS_THRESHOLDS,
  CONFIDENCE_FACTORS,
};
