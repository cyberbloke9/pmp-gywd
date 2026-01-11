/**
 * Context Predictor
 *
 * Predicts what context a developer needs based on patterns,
 * relationships, and access history. The "anticipate" brain.
 */

const { ContextAnalyzer, RELATIONSHIP_WEIGHTS: _RELATIONSHIP_WEIGHTS } = require('./context-analyzer');

/**
 * Prediction confidence levels
 */
const CONFIDENCE = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * Context types
 */
const CONTEXT_TYPES = {
  FILE: 'file',
  DECISION: 'decision',
  PATTERN: 'pattern',
  DOCUMENTATION: 'documentation',
  HISTORY: 'history',
};

/**
 * Access pattern tracker
 */
class AccessPattern {
  constructor(maxSize = 1000) {
    this.accesses = [];
    this.sessions = [];
    this.currentSession = [];
    this.maxSize = maxSize;
    this.coOccurrence = new Map();
  }

  /**
   * Record a file access
   * @param {string} file - File path
   * @param {string} context - Access context (e.g., 'read', 'edit', 'search')
   */
  recordAccess(file, context = 'read') {
    const entry = {
      file,
      timestamp: Date.now(),
      context,
    };

    this.accesses.push(entry);
    this.currentSession.push(file);

    // Trim if exceeding max size
    if (this.accesses.length > this.maxSize) {
      this.accesses = this.accesses.slice(-this.maxSize);
    }

    // Update co-occurrence with recent accesses
    const recentFiles = this.currentSession.slice(-5);
    for (const recent of recentFiles) {
      if (recent !== file) {
        this.incrementCoOccurrence(file, recent);
      }
    }
  }

  /**
   * Increment co-occurrence count
   * @param {string} file1 - First file
   * @param {string} file2 - Second file
   */
  incrementCoOccurrence(file1, file2) {
    if (!this.coOccurrence.has(file1)) {
      this.coOccurrence.set(file1, new Map());
    }
    if (!this.coOccurrence.has(file2)) {
      this.coOccurrence.set(file2, new Map());
    }

    const count1 = this.coOccurrence.get(file1).get(file2) || 0;
    this.coOccurrence.get(file1).set(file2, count1 + 1);

    const count2 = this.coOccurrence.get(file2).get(file1) || 0;
    this.coOccurrence.get(file2).set(file1, count2 + 1);
  }

  /**
   * End current session and start new one
   */
  endSession() {
    if (this.currentSession.length > 0) {
      this.sessions.push([...this.currentSession]);
      this.currentSession = [];

      // Keep only last 50 sessions
      if (this.sessions.length > 50) {
        this.sessions = this.sessions.slice(-50);
      }
    }
  }

  /**
   * Get files frequently accessed with given file
   * @param {string} file - File path
   * @param {number} limit - Maximum results
   * @returns {Array<{file: string, count: number}>}
   */
  getFrequentlyAccessedWith(file, limit = 10) {
    const coOccurMap = this.coOccurrence.get(file);
    if (!coOccurMap) return [];

    const results = [];
    for (const [otherFile, count] of coOccurMap) {
      results.push({ file: otherFile, count });
    }

    results.sort((a, b) => b.count - a.count);
    return results.slice(0, limit);
  }

  /**
   * Get recently accessed files
   * @param {number} limit - Maximum results
   * @returns {string[]}
   */
  getRecentFiles(limit = 10) {
    const seen = new Set();
    const result = [];

    for (let i = this.accesses.length - 1; i >= 0 && result.length < limit; i--) {
      const file = this.accesses[i].file;
      if (!seen.has(file)) {
        seen.add(file);
        result.push(file);
      }
    }

    return result;
  }

  /**
   * Get session patterns (files commonly accessed together)
   * @returns {Array<{files: string[], frequency: number}>}
   */
  getSessionPatterns() {
    const patterns = new Map();

    for (const session of this.sessions) {
      // Look for pairs that appear together
      for (let i = 0; i < session.length; i++) {
        for (let j = i + 1; j < session.length; j++) {
          const key = [session[i], session[j]].sort().join('|');
          patterns.set(key, (patterns.get(key) || 0) + 1);
        }
      }
    }

    const result = [];
    for (const [key, frequency] of patterns) {
      if (frequency >= 2) { // Appeared in at least 2 sessions
        result.push({
          files: key.split('|'),
          frequency,
        });
      }
    }

    result.sort((a, b) => b.frequency - a.frequency);
    return result.slice(0, 20);
  }

  /**
   * Export access data
   * @returns {object}
   */
  export() {
    const coOccur = {};
    for (const [file, map] of this.coOccurrence) {
      coOccur[file] = Object.fromEntries(map);
    }

    return {
      accesses: this.accesses.slice(-500),
      sessions: this.sessions.slice(-20),
      coOccurrence: coOccur,
    };
  }

  /**
   * Import access data
   * @param {object} data - Previously exported data
   */
  import(data) {
    if (data.accesses) {
      this.accesses = data.accesses;
    }
    if (data.sessions) {
      this.sessions = data.sessions;
    }
    if (data.coOccurrence) {
      for (const [file, map] of Object.entries(data.coOccurrence)) {
        this.coOccurrence.set(file, new Map(Object.entries(map)));
      }
    }
  }

  /**
   * Clear all data
   */
  clear() {
    this.accesses = [];
    this.sessions = [];
    this.currentSession = [];
    this.coOccurrence.clear();
  }
}

/**
 * Context Predictor class
 */
class ContextPredictor {
  constructor() {
    this.analyzer = new ContextAnalyzer();
    this.accessPattern = new AccessPattern();
    this.featureFileMap = new Map(); // feature -> Set<files>
    this.taskHistory = []; // [{task, files, timestamp}]
  }

  /**
   * Get the context analyzer
   * @returns {ContextAnalyzer}
   */
  getAnalyzer() {
    return this.analyzer;
  }

  /**
   * Record file access
   * @param {string} file - File path
   * @param {string} context - Access context
   */
  recordAccess(file, context = 'read') {
    this.accessPattern.recordAccess(file, context);
  }

  /**
   * Record a task with its associated files
   * @param {string} task - Task description
   * @param {string[]} files - Files used for task
   */
  recordTask(task, files) {
    this.taskHistory.push({
      task,
      files,
      timestamp: Date.now(),
    });

    // Keep last 100 tasks
    if (this.taskHistory.length > 100) {
      this.taskHistory = this.taskHistory.slice(-100);
    }

    // Extract keywords and map to files
    const keywords = this.extractTaskKeywords(task);
    for (const keyword of keywords) {
      if (!this.featureFileMap.has(keyword)) {
        this.featureFileMap.set(keyword, new Set());
      }
      for (const file of files) {
        this.featureFileMap.get(keyword).add(file);
      }
    }
  }

  /**
   * Extract keywords from task description
   * @param {string} task - Task description
   * @returns {string[]} Keywords
   */
  extractTaskKeywords(task) {
    const words = task
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Filter common words
    const stopWords = new Set([
      'the', 'and', 'for', 'add', 'fix', 'update', 'create', 'implement',
      'make', 'use', 'with', 'from', 'this', 'that', 'will', 'should',
    ]);

    return words.filter(w => !stopWords.has(w));
  }

  /**
   * Predict context needed for a task
   * @param {string} task - Task description
   * @param {object} options - Prediction options
   * @returns {object} Predicted context
   */
  predictForTask(task, options = {}) {
    const {
      maxFiles = 10,
      includeDecisions: _includeDecisions = true,
      includePatterns: _includePatterns = true,
    } = options;

    const predictions = {
      files: [],
      decisions: [],
      patterns: [],
      confidence: CONFIDENCE.MEDIUM,
      reasoning: [],
    };

    const keywords = this.extractTaskKeywords(task);
    const fileScores = new Map();

    // Score files based on task keywords
    for (const keyword of keywords) {
      // Check feature-file map from task history
      const featureFiles = this.featureFileMap.get(keyword);
      if (featureFiles) {
        for (const file of featureFiles) {
          const current = fileScores.get(file) || 0;
          fileScores.set(file, current + 0.8);
        }
        predictions.reasoning.push(`Keyword "${keyword}" matched from task history`);
      }

      // Check analyzer keywords
      const analyzerFiles = this.analyzer.findByKeyword(keyword);
      for (const file of analyzerFiles) {
        const current = fileScores.get(file) || 0;
        fileScores.set(file, current + 0.5);
      }
      if (analyzerFiles.length > 0) {
        predictions.reasoning.push(`Keyword "${keyword}" found in ${analyzerFiles.length} files`);
      }
    }

    // Add scores from recent access patterns
    const recentFiles = this.accessPattern.getRecentFiles(5);
    for (const file of recentFiles) {
      // Get related files
      const related = this.analyzer.getRelatedFiles(file, 5);
      for (const { file: relatedFile, score } of related) {
        const current = fileScores.get(relatedFile) || 0;
        fileScores.set(relatedFile, current + score * 0.3);
      }
    }

    // Check session patterns
    const sessionPatterns = this.accessPattern.getSessionPatterns();
    for (const { files: patternFiles } of sessionPatterns.slice(0, 5)) {
      // If one file in pattern is scored, boost the others
      for (const file of patternFiles) {
        if (fileScores.has(file)) {
          for (const otherFile of patternFiles) {
            if (otherFile !== file) {
              const current = fileScores.get(otherFile) || 0;
              fileScores.set(otherFile, current + 0.4);
            }
          }
        }
      }
    }

    // Sort and limit results
    const sortedFiles = Array.from(fileScores.entries())
      .map(([file, score]) => ({ file, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFiles);

    predictions.files = sortedFiles.map(({ file, score }) => ({
      path: file,
      score,
      confidence: score > 1.5 ? CONFIDENCE.HIGH :
        score > 0.8 ? CONFIDENCE.MEDIUM : CONFIDENCE.LOW,
      type: CONTEXT_TYPES.FILE,
    }));

    // Determine overall confidence
    if (predictions.files.length > 0) {
      const avgScore = predictions.files.reduce((a, b) => a + b.score, 0) / predictions.files.length;
      predictions.confidence = avgScore > 1.5 ? CONFIDENCE.HIGH :
        avgScore > 0.8 ? CONFIDENCE.MEDIUM : CONFIDENCE.LOW;
    }

    return predictions;
  }

  /**
   * Predict context for working with a specific file
   * @param {string} filePath - File being worked on
   * @param {object} options - Prediction options
   * @returns {object} Predicted context
   */
  predictForFile(filePath, options = {}) {
    const { maxFiles = 10 } = options;

    const predictions = {
      files: [],
      confidence: CONFIDENCE.MEDIUM,
      reasoning: [],
    };

    const fileScores = new Map();

    // Get directly related files from analyzer
    const related = this.analyzer.getRelatedFiles(filePath, maxFiles * 2);
    for (const { file, score, relationships } of related) {
      fileScores.set(file, score);
      predictions.reasoning.push(`${file} related via: ${relationships.join(', ')}`);
    }

    // Get frequently accessed together
    const frequentlyWith = this.accessPattern.getFrequentlyAccessedWith(filePath, 5);
    for (const { file, count } of frequentlyWith) {
      const current = fileScores.get(file) || 0;
      const bonus = Math.min(count * 0.2, 1.0); // Cap bonus at 1.0
      fileScores.set(file, current + bonus);
      predictions.reasoning.push(`${file} accessed together ${count} times`);
    }

    // Sort and format results
    const sortedFiles = Array.from(fileScores.entries())
      .map(([file, score]) => ({ file, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFiles);

    predictions.files = sortedFiles.map(({ file, score }) => ({
      path: file,
      score,
      confidence: score > 2.0 ? CONFIDENCE.HIGH :
        score > 1.0 ? CONFIDENCE.MEDIUM : CONFIDENCE.LOW,
      type: CONTEXT_TYPES.FILE,
    }));

    if (predictions.files.length > 0) {
      const maxScore = predictions.files[0].score;
      predictions.confidence = maxScore > 2.0 ? CONFIDENCE.HIGH :
        maxScore > 1.0 ? CONFIDENCE.MEDIUM : CONFIDENCE.LOW;
    }

    return predictions;
  }

  /**
   * Predict context for a feature/topic
   * @param {string} feature - Feature or topic name
   * @param {object} options - Prediction options
   * @returns {object} Predicted context
   */
  predictForFeature(feature, options = {}) {
    const { maxFiles = 15 } = options;

    const predictions = {
      files: [],
      confidence: CONFIDENCE.LOW,
      reasoning: [],
    };

    const keywords = feature
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const fileScores = new Map();

    // Search by keywords
    for (const keyword of keywords) {
      const files = this.analyzer.findByKeyword(keyword);
      for (const file of files) {
        const current = fileScores.get(file) || 0;
        fileScores.set(file, current + 1.0);
      }

      // Check feature-file map
      const featureFiles = this.featureFileMap.get(keyword);
      if (featureFiles) {
        for (const file of featureFiles) {
          const current = fileScores.get(file) || 0;
          fileScores.set(file, current + 1.5);
        }
      }
    }

    // Search by multiple keywords (intersection gets bonus)
    if (keywords.length > 1) {
      const intersectionFiles = this.analyzer.findByKeywords(keywords);
      for (const file of intersectionFiles) {
        const current = fileScores.get(file) || 0;
        fileScores.set(file, current + 2.0);
        predictions.reasoning.push(`${file} matches multiple keywords`);
      }
    }

    // Add related files for top scored files
    const topFiles = Array.from(fileScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [file] of topFiles) {
      const related = this.analyzer.getRelatedFiles(file, 3);
      for (const { file: relatedFile, score } of related) {
        const current = fileScores.get(relatedFile) || 0;
        fileScores.set(relatedFile, current + score * 0.5);
      }
    }

    // Sort and format results
    const sortedFiles = Array.from(fileScores.entries())
      .map(([file, score]) => ({ file, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFiles);

    predictions.files = sortedFiles.map(({ file, score }) => ({
      path: file,
      score,
      confidence: score > 3.0 ? CONFIDENCE.HIGH :
        score > 1.5 ? CONFIDENCE.MEDIUM : CONFIDENCE.LOW,
      type: CONTEXT_TYPES.FILE,
    }));

    if (predictions.files.length > 0) {
      predictions.confidence = predictions.files[0].score > 3.0 ? CONFIDENCE.HIGH :
        predictions.files[0].score > 1.5 ? CONFIDENCE.MEDIUM : CONFIDENCE.LOW;
    }

    predictions.reasoning.push(`Searched for feature: "${feature}"`);
    predictions.reasoning.push(`Found ${predictions.files.length} relevant files`);

    return predictions;
  }

  /**
   * Get prediction summary
   * @returns {object} Summary statistics
   */
  getSummary() {
    return {
      analyzer: this.analyzer.getSummary(),
      accessPatterns: {
        totalAccesses: this.accessPattern.accesses.length,
        sessionsTracked: this.accessPattern.sessions.length,
        currentSessionFiles: this.accessPattern.currentSession.length,
      },
      featuresTracked: this.featureFileMap.size,
      tasksRecorded: this.taskHistory.length,
    };
  }

  /**
   * End current session
   */
  endSession() {
    this.accessPattern.endSession();
  }

  /**
   * Export all data for persistence
   * @returns {object}
   */
  export() {
    const featureMap = {};
    for (const [feature, files] of this.featureFileMap) {
      featureMap[feature] = Array.from(files);
    }

    return {
      analyzer: this.analyzer.export(),
      accessPattern: this.accessPattern.export(),
      featureFileMap: featureMap,
      taskHistory: this.taskHistory.slice(-50),
    };
  }

  /**
   * Import data from persistence
   * @param {object} data - Previously exported data
   */
  import(data) {
    if (data.analyzer) {
      this.analyzer.import(data.analyzer);
    }
    if (data.accessPattern) {
      this.accessPattern.import(data.accessPattern);
    }
    if (data.featureFileMap) {
      for (const [feature, files] of Object.entries(data.featureFileMap)) {
        this.featureFileMap.set(feature, new Set(files));
      }
    }
    if (data.taskHistory) {
      this.taskHistory = data.taskHistory;
    }
  }

  /**
   * Clear all data
   */
  clear() {
    this.analyzer.clear();
    this.accessPattern.clear();
    this.featureFileMap.clear();
    this.taskHistory = [];
  }
}

module.exports = {
  ContextPredictor,
  AccessPattern,
  CONFIDENCE,
  CONTEXT_TYPES,
};
