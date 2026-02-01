'use strict';

/**
 * Review Agent
 *
 * Reviews code and provides feedback with suggestions.
 * dbt-style analytics engineering pattern.
 * Part of Phase 31: Analytics Agents.
 */

const { BaseAgent, AGENT_PRIORITY } = require('../agents/base-agent');

/**
 * Review categories
 */
const REVIEW_CATEGORY = {
  STYLE: 'style',
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  MAINTAINABILITY: 'maintainability',
  TESTING: 'testing',
  DOCUMENTATION: 'documentation',
  BEST_PRACTICES: 'best_practices',
};

/**
 * Review severity levels
 */
const REVIEW_SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  SUGGESTION: 'suggestion',
};

/**
 * Review Agent
 */
class ReviewAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Review Agent',
      type: 'review_agent',
      priority: AGENT_PRIORITY.HIGH,
      ...options,
    });

    this.rules = this._buildRules(options.customRules || []);
    this.strictMode = options.strictMode || false;
  }

  async onExecute() {
    const { code, language, filePath, context } = this.context;

    if (!code) {
      return { success: false, error: 'No code provided for review' };
    }

    const lang = language || this._detectLanguage(code, filePath);

    try {
      const findings = this._reviewCode(code, lang, filePath || 'unknown');
      const score = this._calculateScore(findings);
      const summary = this._generateSummary(findings, score);

      return {
        success: true,
        findings,
        score,
        summary,
        language: lang,
        stats: {
          totalFindings: findings.length,
          errors: findings.filter(f => f.severity === REVIEW_SEVERITY.ERROR).length,
          warnings: findings.filter(f => f.severity === REVIEW_SEVERITY.WARNING).length,
          suggestions: findings.filter(f => f.severity === REVIEW_SEVERITY.SUGGESTION).length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build review rules
   * @param {Array} customRules
   * @returns {Array}
   */
  _buildRules(customRules) {
    const builtInRules = [
      // Style rules
      {
        id: 'no-console',
        category: REVIEW_CATEGORY.BEST_PRACTICES,
        severity: REVIEW_SEVERITY.WARNING,
        pattern: /console\.(log|debug|info|warn|error)\(/g,
        message: 'Avoid console statements in production code',
        suggestion: 'Use a proper logging library or remove before deployment',
      },
      {
        id: 'no-debugger',
        category: REVIEW_CATEGORY.BEST_PRACTICES,
        severity: REVIEW_SEVERITY.ERROR,
        pattern: /\bdebugger\b/g,
        message: 'Remove debugger statements',
        suggestion: 'Remove debugger statement before committing',
      },
      {
        id: 'no-todo-fixme',
        category: REVIEW_CATEGORY.MAINTAINABILITY,
        severity: REVIEW_SEVERITY.INFO,
        pattern: /\b(TODO|FIXME|HACK|XXX)\b/gi,
        message: 'Found TODO/FIXME comment',
        suggestion: 'Address or create an issue to track this',
      },

      // Security rules
      {
        id: 'no-eval',
        category: REVIEW_CATEGORY.SECURITY,
        severity: REVIEW_SEVERITY.ERROR,
        pattern: /\beval\s*\(/g,
        message: 'Avoid using eval() - security risk',
        suggestion: 'Use safer alternatives like JSON.parse() or Function constructor',
      },
      {
        id: 'no-innerHTML',
        category: REVIEW_CATEGORY.SECURITY,
        severity: REVIEW_SEVERITY.WARNING,
        pattern: /\.innerHTML\s*=/g,
        message: 'innerHTML assignment may cause XSS',
        suggestion: 'Use textContent or sanitize input before assignment',
      },
      {
        id: 'hardcoded-secret',
        category: REVIEW_CATEGORY.SECURITY,
        severity: REVIEW_SEVERITY.ERROR,
        pattern: /(password|secret|api_key|apikey)\s*[:=]\s*['"][^'"]+['"]/gi,
        message: 'Possible hardcoded secret/credential',
        suggestion: 'Use environment variables for sensitive data',
      },

      // Performance rules
      {
        id: 'array-foreach-push',
        category: REVIEW_CATEGORY.PERFORMANCE,
        severity: REVIEW_SEVERITY.SUGGESTION,
        pattern: /\.forEach\([^)]+\)\s*\{[^}]*\.push\(/g,
        message: 'Consider using map() instead of forEach() with push()',
        suggestion: 'Array.map() is more idiomatic and often clearer',
      },
      {
        id: 'nested-loops',
        category: REVIEW_CATEGORY.PERFORMANCE,
        severity: REVIEW_SEVERITY.INFO,
        pattern: /for\s*\([^)]+\)\s*\{[^}]*for\s*\([^)]+\)/g,
        message: 'Nested loops detected - potential O(n²) complexity',
        suggestion: 'Consider if this can be optimized with a different data structure',
      },

      // Maintainability rules
      {
        id: 'long-function',
        category: REVIEW_CATEGORY.MAINTAINABILITY,
        severity: REVIEW_SEVERITY.INFO,
        pattern: /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{1000,}?\}/g,
        message: 'Long function detected',
        suggestion: 'Consider breaking this into smaller functions',
      },
      {
        id: 'magic-numbers',
        category: REVIEW_CATEGORY.MAINTAINABILITY,
        severity: REVIEW_SEVERITY.SUGGESTION,
        pattern: /[^.\d]\d{3,}[^.\d]/g,
        message: 'Magic number detected',
        suggestion: 'Extract to a named constant for clarity',
      },

      // Testing rules
      {
        id: 'empty-catch',
        category: REVIEW_CATEGORY.TESTING,
        severity: REVIEW_SEVERITY.WARNING,
        pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
        message: 'Empty catch block - errors are silently swallowed',
        suggestion: 'Log the error or handle it appropriately',
      },

      // Documentation rules
      {
        id: 'missing-jsdoc',
        category: REVIEW_CATEGORY.DOCUMENTATION,
        severity: REVIEW_SEVERITY.INFO,
        pattern: /(?<!\/\*\*[\s\S]*?\*\/\s*)^(export\s+)?(async\s+)?function\s+\w+/gm,
        message: 'Function missing JSDoc documentation',
        suggestion: 'Add JSDoc comment describing the function',
      },
    ];

    return [...builtInRules, ...customRules];
  }

  /**
   * Review code against rules
   * @param {string} code
   * @param {string} language
   * @param {string} filePath
   * @returns {Array}
   */
  _reviewCode(code, language, filePath) {
    const findings = [];
    const lines = code.split('\n');

    for (const rule of this.rules) {
      // Skip rules not applicable to language
      if (rule.languages && !rule.languages.includes(language)) {
        continue;
      }

      // Reset pattern lastIndex for global patterns
      if (rule.pattern.global) {
        rule.pattern.lastIndex = 0;
      }

      let match;
      while ((match = rule.pattern.exec(code)) !== null) {
        const line = this._getLineNumber(code, match.index);

        findings.push({
          id: rule.id,
          category: rule.category,
          severity: rule.severity,
          message: rule.message,
          suggestion: rule.suggestion,
          line,
          column: match.index - code.lastIndexOf('\n', match.index - 1),
          match: match[0].substring(0, 50) + (match[0].length > 50 ? '...' : ''),
          filePath,
        });

        // For non-global patterns, break after first match
        if (!rule.pattern.global) {
          break;
        }
      }
    }

    // Additional structural analysis
    findings.push(...this._analyzeStructure(code, language));

    // Sort by severity and line
    findings.sort((a, b) => {
      const severityOrder = [REVIEW_SEVERITY.ERROR, REVIEW_SEVERITY.WARNING, REVIEW_SEVERITY.INFO, REVIEW_SEVERITY.SUGGESTION];
      const severityDiff = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
      if (severityDiff !== 0) return severityDiff;
      return a.line - b.line;
    });

    return findings;
  }

  /**
   * Analyze code structure
   * @param {string} code
   * @param {string} language
   * @returns {Array}
   */
  _analyzeStructure(code, language) {
    const findings = [];
    const lines = code.split('\n');

    // Check line count
    if (lines.length > 500) {
      findings.push({
        id: 'file-too-long',
        category: REVIEW_CATEGORY.MAINTAINABILITY,
        severity: REVIEW_SEVERITY.INFO,
        message: `File has ${lines.length} lines`,
        suggestion: 'Consider splitting into smaller modules',
        line: 1,
      });
    }

    // Check for very long lines
    lines.forEach((line, index) => {
      if (line.length > 120) {
        findings.push({
          id: 'line-too-long',
          category: REVIEW_CATEGORY.STYLE,
          severity: REVIEW_SEVERITY.SUGGESTION,
          message: `Line exceeds 120 characters (${line.length})`,
          suggestion: 'Break into multiple lines for readability',
          line: index + 1,
        });
      }
    });

    // Check function/method count
    const functionCount = (code.match(/\bfunction\s+\w+/g) || []).length;
    const methodCount = (code.match(/\w+\s*\([^)]*\)\s*\{/g) || []).length;

    if (functionCount + methodCount > 20) {
      findings.push({
        id: 'too-many-functions',
        category: REVIEW_CATEGORY.MAINTAINABILITY,
        severity: REVIEW_SEVERITY.INFO,
        message: `File has ${functionCount + methodCount} functions/methods`,
        suggestion: 'Consider splitting into multiple modules',
        line: 1,
      });
    }

    return findings;
  }

  /**
   * Get line number for character index
   * @param {string} code
   * @param {number} index
   * @returns {number}
   */
  _getLineNumber(code, index) {
    return code.substring(0, index).split('\n').length;
  }

  /**
   * Detect language from code or file path
   * @param {string} code
   * @param {string} filePath
   * @returns {string}
   */
  _detectLanguage(code, filePath) {
    if (filePath) {
      const ext = filePath.split('.').pop().toLowerCase();
      const extMap = {
        js: 'javascript',
        jsx: 'javascript',
        ts: 'typescript',
        tsx: 'typescript',
        py: 'python',
        sql: 'sql',
        rb: 'ruby',
        go: 'go',
        rs: 'rust',
      };
      if (extMap[ext]) return extMap[ext];
    }

    // Detect from code patterns
    if (code.includes('interface ') || code.includes(': string') || code.includes(': number')) {
      return 'typescript';
    }
    if (code.includes('def ') || code.includes('import ') && code.includes(':')) {
      return 'python';
    }
    if (code.includes('SELECT ') || code.includes('FROM ')) {
      return 'sql';
    }

    return 'javascript';
  }

  /**
   * Calculate quality score
   * @param {Array} findings
   * @returns {object}
   */
  _calculateScore(findings) {
    let score = 100;

    const penalties = {
      [REVIEW_SEVERITY.ERROR]: 15,
      [REVIEW_SEVERITY.WARNING]: 5,
      [REVIEW_SEVERITY.INFO]: 1,
      [REVIEW_SEVERITY.SUGGESTION]: 0,
    };

    for (const finding of findings) {
      score -= penalties[finding.severity] || 0;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      overall: score,
      grade: this._scoreToGrade(score),
      breakdown: {
        errors: findings.filter(f => f.severity === REVIEW_SEVERITY.ERROR).length,
        warnings: findings.filter(f => f.severity === REVIEW_SEVERITY.WARNING).length,
        info: findings.filter(f => f.severity === REVIEW_SEVERITY.INFO).length,
        suggestions: findings.filter(f => f.severity === REVIEW_SEVERITY.SUGGESTION).length,
      },
    };
  }

  /**
   * Convert score to letter grade
   * @param {number} score
   * @returns {string}
   */
  _scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate review summary
   * @param {Array} findings
   * @param {object} score
   * @returns {string}
   */
  _generateSummary(findings, score) {
    const lines = [];

    lines.push(`## Code Review Summary`);
    lines.push(``);
    lines.push(`**Score:** ${score.overall}/100 (Grade: ${score.grade})`);
    lines.push(``);
    lines.push(`### Findings`);
    lines.push(``);
    lines.push(`- Errors: ${score.breakdown.errors}`);
    lines.push(`- Warnings: ${score.breakdown.warnings}`);
    lines.push(`- Info: ${score.breakdown.info}`);
    lines.push(`- Suggestions: ${score.breakdown.suggestions}`);
    lines.push(``);

    if (findings.length > 0) {
      lines.push(`### Top Issues`);
      lines.push(``);

      for (const finding of findings.slice(0, 5)) {
        lines.push(`- **[${finding.severity.toUpperCase()}]** Line ${finding.line}: ${finding.message}`);
        if (finding.suggestion) {
          lines.push(`  - Suggestion: ${finding.suggestion}`);
        }
      }

      if (findings.length > 5) {
        lines.push(``);
        lines.push(`*... and ${findings.length - 5} more findings*`);
      }
    } else {
      lines.push(`No issues found! Code looks good.`);
    }

    return lines.join('\n');
  }

  /**
   * Add custom rule
   * @param {object} rule
   */
  addRule(rule) {
    this.rules.push(rule);
  }
}

module.exports = {
  ReviewAgent,
  REVIEW_CATEGORY,
  REVIEW_SEVERITY,
};
