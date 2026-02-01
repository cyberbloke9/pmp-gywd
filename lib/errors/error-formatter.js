'use strict';

/**
 * Error Formatter
 *
 * Provides human-friendly error messages with suggestions and recovery hints.
 * Part of Phase 23: Error UX improvements.
 */

/**
 * Common error patterns and their friendly messages
 */
const ERROR_PATTERNS = {
  ENOENT: {
    title: 'File Not Found',
    suggestion: 'Check the file path and ensure it exists.',
    recovery: 'Create the file or check the path spelling.',
  },
  EACCES: {
    title: 'Permission Denied',
    suggestion: 'You may not have permission to access this file.',
    recovery: 'Check file permissions or run with elevated privileges.',
  },
  ENOTDIR: {
    title: 'Not a Directory',
    suggestion: 'Expected a directory but found a file.',
    recovery: 'Verify the path points to a directory.',
  },
  EISDIR: {
    title: 'Is a Directory',
    suggestion: 'Expected a file but found a directory.',
    recovery: 'Specify a file path instead of a directory.',
  },
  EEXIST: {
    title: 'Already Exists',
    suggestion: 'The file or directory already exists.',
    recovery: 'Use --force to overwrite or choose a different name.',
  },
  PLANNING_NOT_FOUND: {
    title: 'GYWD Project Not Found',
    suggestion: 'No .planning directory found in this location.',
    recovery: 'Run /gywd:init to initialize a new project.',
  },
  STATE_INVALID: {
    title: 'Invalid Project State',
    suggestion: 'STATE.md is missing or corrupted.',
    recovery: 'Run /gywd:resume-work to reconstruct state.',
  },
  PHASE_NOT_FOUND: {
    title: 'Phase Not Found',
    suggestion: 'The specified phase does not exist in the roadmap.',
    recovery: 'Check /gywd:progress for available phases.',
  },
  PLAN_NOT_FOUND: {
    title: 'Plan Not Found',
    suggestion: 'No plan file found for this phase.',
    recovery: 'Run /gywd:plan-phase to create plans.',
  },
  GIT_NOT_CLEAN: {
    title: 'Uncommitted Changes',
    suggestion: 'You have uncommitted changes in your working directory.',
    recovery: 'Commit or stash changes before proceeding.',
  },
  NETWORK_ERROR: {
    title: 'Network Error',
    suggestion: 'Could not connect to the remote service.',
    recovery: 'Check your internet connection and try again.',
  },
};

/**
 * ErrorFormatter class
 */
class ErrorFormatter {
  /**
   * Format an error for display
   * @param {Error|string} error - Error to format
   * @param {object} context - Additional context
   * @returns {object} Formatted error with message, suggestion, recovery
   */
  format(error, context = {}) {
    const errorCode = this._extractCode(error);
    const pattern = ERROR_PATTERNS[errorCode];

    if (pattern) {
      return {
        code: errorCode,
        title: pattern.title,
        message: this._getMessage(error),
        suggestion: pattern.suggestion,
        recovery: pattern.recovery,
        context,
      };
    }

    // Generic error formatting
    return {
      code: 'UNKNOWN',
      title: 'Error',
      message: this._getMessage(error),
      suggestion: 'An unexpected error occurred.',
      recovery: 'Check the error details and try again.',
      context,
    };
  }

  /**
   * Format error as markdown
   * @param {Error|string} error - Error to format
   * @param {object} context - Additional context
   * @returns {string} Markdown formatted error
   */
  formatMarkdown(error, context = {}) {
    const formatted = this.format(error, context);

    const lines = [
      `## ${formatted.title}`,
      '',
      formatted.message,
      '',
      `**Suggestion:** ${formatted.suggestion}`,
      '',
      `**Recovery:** ${formatted.recovery}`,
    ];

    if (Object.keys(formatted.context).length > 0) {
      lines.push('', '**Context:**');
      for (const [key, value] of Object.entries(formatted.context)) {
        lines.push(`- ${key}: ${value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format error as single line
   * @param {Error|string} error - Error to format
   * @returns {string} Single line error
   */
  formatCompact(error) {
    const formatted = this.format(error);
    return `${formatted.title}: ${formatted.message} (${formatted.recovery})`;
  }

  /**
   * Check if error matches a known pattern
   * @param {Error|string} error - Error to check
   * @param {string} code - Error code to match
   * @returns {boolean}
   */
  matches(error, code) {
    return this._extractCode(error) === code;
  }

  /**
   * Create a GYWD-specific error
   * @param {string} code - Error code from ERROR_PATTERNS
   * @param {string} message - Additional message
   * @param {object} context - Context data
   * @returns {Error}
   */
  createError(code, message = '', context = {}) {
    const pattern = ERROR_PATTERNS[code] || ERROR_PATTERNS.UNKNOWN;
    const error = new Error(message || pattern.title);
    error.code = code;
    error.gywd = { pattern, context };
    return error;
  }

  /**
   * Extract error code from various error types
   * @param {Error|string} error
   * @returns {string}
   */
  _extractCode(error) {
    if (typeof error === 'string') {
      // Check if string matches a known code
      for (const code of Object.keys(ERROR_PATTERNS)) {
        if (error.includes(code)) return code;
      }
      return 'UNKNOWN';
    }

    if (error.code) return error.code;
    if (error.errno) return error.errno;

    // Check message for patterns
    const message = error.message || '';
    for (const code of Object.keys(ERROR_PATTERNS)) {
      if (message.includes(code)) return code;
    }

    return 'UNKNOWN';
  }

  /**
   * Extract message from error
   * @param {Error|string} error
   * @returns {string}
   */
  _getMessage(error) {
    if (typeof error === 'string') return error;
    return error.message || String(error);
  }

  /**
   * Get all known error patterns
   * @returns {object}
   */
  getPatterns() {
    return { ...ERROR_PATTERNS };
  }

  /**
   * Add a custom error pattern
   * @param {string} code - Error code
   * @param {object} pattern - Pattern with title, suggestion, recovery
   */
  addPattern(code, pattern) {
    ERROR_PATTERNS[code] = pattern;
  }
}

// Singleton instance
const errorFormatter = new ErrorFormatter();

module.exports = {
  ErrorFormatter,
  errorFormatter,
  ERROR_PATTERNS,
};
