/**
 * Pattern Learner
 *
 * Analyzes developer interactions to learn patterns and preferences.
 * Part of the Developer Digital Twin system.
 */

/**
 * Pattern types that can be learned
 */
const PATTERN_TYPES = {
  NAMING: 'naming',
  STRUCTURE: 'structure',
  ERROR_HANDLING: 'error-handling',
  TESTING: 'testing',
  DOCUMENTATION: 'documentation',
  WORKFLOW: 'workflow',
};

/**
 * Signals that indicate patterns
 */
const PATTERN_SIGNALS = {
  // Naming patterns
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
  snake_case: /^[a-z][a-z0-9_]*$/,
  PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
  SCREAMING_SNAKE: /^[A-Z][A-Z0-9_]*$/,

  // Testing patterns
  testPrefix: /^test[A-Z]/,
  shouldPrefix: /^should[A-Z]/,
  itPrefix: /^it[A-Z]/,
  describePattern: /describe\s*\(/,

  // Documentation patterns
  jsdoc: /\/\*\*[\s\S]*?\*\//,
  inlineComments: /\/\/.*$/m,
  markdownDocs: /^#+\s+/m,
};

/**
 * Pattern Learner class
 */
class PatternLearner {
  constructor() {
    this.observations = [];
    this.learnedPatterns = new Map();
    this.confidenceThreshold = 0.7;
  }

  /**
   * Observe a code sample
   * @param {string} code - Code to analyze
   * @param {string} context - Context (e.g., 'function', 'class', 'test')
   */
  observeCode(code, context = 'general') {
    const observation = {
      timestamp: Date.now(),
      context,
      patterns: this.extractPatterns(code),
    };

    this.observations.push(observation);
    this.updateLearnedPatterns();

    return observation.patterns;
  }

  /**
   * Extract patterns from code
   * @param {string} code - Code to analyze
   * @returns {object} Detected patterns
   */
  extractPatterns(code) {
    const patterns = {
      naming: this.detectNamingPatterns(code),
      documentation: this.detectDocPatterns(code),
      testing: this.detectTestingPatterns(code),
      structure: this.detectStructurePatterns(code),
    };

    return patterns;
  }

  /**
   * Detect naming conventions
   * @param {string} code - Code to analyze
   * @returns {object} Naming patterns
   */
  detectNamingPatterns(code) {
    // Extract identifiers (simplified)
    const functionNames = code.match(/function\s+(\w+)/g) || [];
    const varNames = code.match(/(?:const|let|var)\s+(\w+)/g) || [];

    let camelCount = 0;
    let snakeCount = 0;
    let pascalCount = 0;

    const allNames = [...functionNames, ...varNames].map(m => {
      const parts = m.split(/\s+/);
      return parts[parts.length - 1];
    });

    for (const name of allNames) {
      if (PATTERN_SIGNALS.camelCase.test(name)) camelCount++;
      if (PATTERN_SIGNALS.snake_case.test(name)) snakeCount++;
      if (PATTERN_SIGNALS.PascalCase.test(name)) pascalCount++;
    }

    const total = allNames.length || 1;

    return {
      camelCase: camelCount / total,
      snake_case: snakeCount / total,
      PascalCase: pascalCount / total,
      dominant: this.getDominant({ camelCount, snakeCount, pascalCount }),
    };
  }

  /**
   * Detect documentation patterns
   * @param {string} code - Code to analyze
   * @returns {object} Documentation patterns
   */
  detectDocPatterns(code) {
    const hasJsdoc = PATTERN_SIGNALS.jsdoc.test(code);
    const hasInline = PATTERN_SIGNALS.inlineComments.test(code);
    const hasMarkdown = PATTERN_SIGNALS.markdownDocs.test(code);

    const codeLines = code.split('\n').length;
    const commentLines = (code.match(/\/\/.*$/gm) || []).length +
      (code.match(/\/\*[\s\S]*?\*\//g) || []).reduce((acc, m) => acc + m.split('\n').length, 0);

    const commentRatio = commentLines / (codeLines || 1);

    return {
      jsdoc: hasJsdoc,
      inlineComments: hasInline,
      markdown: hasMarkdown,
      commentRatio,
      style: hasJsdoc ? 'jsdoc' : hasInline ? 'inline' : 'minimal',
    };
  }

  /**
   * Detect testing patterns
   * @param {string} code - Code to analyze
   * @returns {object} Testing patterns
   */
  detectTestingPatterns(code) {
    const hasDescribe = PATTERN_SIGNALS.describePattern.test(code);
    const hasTest = /\btest\s*\(/.test(code);
    const hasIt = /\bit\s*\(/.test(code);
    const hasExpect = /\bexpect\s*\(/.test(code);
    const hasAssert = /\bassert\./.test(code);

    let framework = 'unknown';
    if (hasDescribe && hasIt && hasExpect) framework = 'jest';
    else if (hasDescribe && hasIt) framework = 'mocha';
    else if (hasAssert) framework = 'node-assert';
    else if (hasTest && hasExpect) framework = 'jest';

    return {
      framework,
      usesDescribe: hasDescribe,
      usesIt: hasIt,
      usesTest: hasTest,
      usesExpect: hasExpect,
    };
  }

  /**
   * Detect structure patterns
   * @param {string} code - Code to analyze
   * @returns {object} Structure patterns
   */
  detectStructurePatterns(code) {
    const hasClasses = /\bclass\s+\w+/.test(code);
    const hasFunctions = /\bfunction\s+\w+/.test(code);
    const hasArrowFunctions = /=>\s*[{(]/.test(code);
    const hasAsync = /\basync\s+/.test(code);
    const hasModuleExports = /module\.exports\s*=/.test(code);
    const hasEsModules = /\bexport\s+(default\s+)?/.test(code);

    return {
      paradigm: hasClasses ? 'oop' : hasFunctions ? 'functional' : 'mixed',
      usesClasses: hasClasses,
      usesFunctions: hasFunctions,
      usesArrowFunctions: hasArrowFunctions,
      usesAsync: hasAsync,
      moduleStyle: hasEsModules ? 'esm' : hasModuleExports ? 'commonjs' : 'unknown',
    };
  }

  /**
   * Get dominant pattern from counts
   * @param {object} counts - Pattern counts
   * @returns {string} Dominant pattern name
   */
  getDominant(counts) {
    let max = 0;
    let dominant = 'mixed';

    for (const [name, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        dominant = name.replace('Count', '');
      }
    }

    return dominant;
  }

  /**
   * Update learned patterns based on observations
   */
  updateLearnedPatterns() {
    if (this.observations.length < 3) return;

    // Aggregate patterns from recent observations
    const recent = this.observations.slice(-10);
    const aggregated = this.aggregatePatterns(recent);

    // Update learned patterns with high confidence
    for (const [category, patterns] of Object.entries(aggregated)) {
      for (const [pattern, confidence] of Object.entries(patterns)) {
        if (confidence >= this.confidenceThreshold) {
          this.learnedPatterns.set(`${category}.${pattern}`, {
            value: true,
            confidence,
            observationCount: recent.length,
          });
        }
      }
    }
  }

  /**
   * Aggregate patterns from multiple observations
   * @param {Array} observations - Observations to aggregate
   * @returns {object} Aggregated patterns
   */
  aggregatePatterns(observations) {
    const aggregated = {};

    for (const obs of observations) {
      for (const [category, patterns] of Object.entries(obs.patterns)) {
        if (!aggregated[category]) aggregated[category] = {};

        for (const [key, value] of Object.entries(patterns)) {
          if (typeof value === 'boolean') {
            aggregated[category][key] = (aggregated[category][key] || 0) + (value ? 1 : 0);
          } else if (typeof value === 'number') {
            aggregated[category][key] = (aggregated[category][key] || 0) + value;
          }
        }
      }
    }

    // Convert to confidence scores
    const count = observations.length;
    for (const category of Object.keys(aggregated)) {
      for (const key of Object.keys(aggregated[category])) {
        aggregated[category][key] /= count;
      }
    }

    return aggregated;
  }

  /**
   * Get all learned patterns
   * @returns {object} Learned patterns
   */
  getLearnedPatterns() {
    return Object.fromEntries(this.learnedPatterns);
  }

  /**
   * Get pattern confidence
   * @param {string} patternKey - Pattern key (e.g., 'naming.camelCase')
   * @returns {number} Confidence level (0-1)
   */
  getConfidence(patternKey) {
    const pattern = this.learnedPatterns.get(patternKey);
    return pattern ? pattern.confidence : 0;
  }

  /**
   * Clear observations (for testing)
   */
  clear() {
    this.observations = [];
    this.learnedPatterns.clear();
  }
}

module.exports = {
  PatternLearner,
  PATTERN_TYPES,
  PATTERN_SIGNALS,
};
