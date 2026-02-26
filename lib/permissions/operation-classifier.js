'use strict';

/**
 * Operation Classifier
 *
 * Classifies operations as safe, dangerous, or unknown based on patterns.
 * Part of Phase 30: Permission Scanner.
 */

/**
 * Operation risk levels
 */
const RISK_LEVEL = {
  SAFE: 'safe',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
  UNKNOWN: 'unknown',
};

/**
 * Operation categories
 */
const OPERATION_CATEGORY = {
  FILE_READ: 'file_read',
  FILE_WRITE: 'file_write',
  FILE_DELETE: 'file_delete',
  FILE_EXECUTE: 'file_execute',
  NETWORK_READ: 'network_read',
  NETWORK_WRITE: 'network_write',
  PROCESS_SPAWN: 'process_spawn',
  SYSTEM_CONFIG: 'system_config',
  CREDENTIAL_ACCESS: 'credential_access',
  DATABASE_READ: 'database_read',
  DATABASE_WRITE: 'database_write',
  UNKNOWN: 'unknown',
};

/**
 * Operation Classifier class
 */
class OperationClassifier {
  constructor(options = {}) {
    this.customPatterns = options.patterns || [];
    this.allowlist = new Set(options.allowlist || []);
    this.blocklist = new Set(options.blocklist || []);

    // Built-in patterns for classification
    this.patterns = this._buildPatterns();
  }

  /**
   * Build classification patterns
   * @returns {Array}
   */
  _buildPatterns() {
    return [
      // Safe operations
      {
        category: OPERATION_CATEGORY.FILE_READ,
        patterns: [
          /^read\s+/i,
          /^cat\s+/i,
          /^head\s+/i,
          /^tail\s+/i,
          /^less\s+/i,
          /^grep\s+/i,
          /^find\s+.*-type\s+f/i,
          /^ls\s+/i,
          /^dir\s+/i,
        ],
        defaultRisk: RISK_LEVEL.SAFE,
      },

      // File write - medium risk
      {
        category: OPERATION_CATEGORY.FILE_WRITE,
        patterns: [
          /^echo\s+.*>/i,
          /^cat\s+.*>/i,
          /^tee\s+/i,
          /^write\s+/i,
          /^touch\s+/i,
          /^mkdir\s+/i,
          /^cp\s+/i,
          /^mv\s+/i,
        ],
        defaultRisk: RISK_LEVEL.MEDIUM,
      },

      // File delete - high risk
      {
        category: OPERATION_CATEGORY.FILE_DELETE,
        patterns: [
          /^rm\s+/i,
          /^rmdir\s+/i,
          /^del\s+/i,
          /^unlink\s+/i,
          /rm\s+-rf\s+/i,
          /rm\s+-r\s+/i,
        ],
        defaultRisk: RISK_LEVEL.HIGH,
      },

      // Process spawn - varies by command
      {
        category: OPERATION_CATEGORY.PROCESS_SPAWN,
        patterns: [
          /^exec\s+/i,
          /^spawn\s+/i,
          /^fork\s+/i,
          /^\.\/[\w-]+/i,
          /^bash\s+/i,
          /^sh\s+/i,
          /^cmd\s+/i,
          /^powershell\s+/i,
        ],
        defaultRisk: RISK_LEVEL.MEDIUM,
      },

      // Network operations
      {
        category: OPERATION_CATEGORY.NETWORK_READ,
        patterns: [
          /^curl\s+.*-[^o]/i,
          /^wget\s+.*-O\s+-/i,
          /^fetch\s+/i,
          /^ping\s+/i,
          /^dig\s+/i,
          /^nslookup\s+/i,
        ],
        defaultRisk: RISK_LEVEL.LOW,
      },

      {
        category: OPERATION_CATEGORY.NETWORK_WRITE,
        patterns: [
          /^curl\s+.*-X\s+POST/i,
          /^curl\s+.*-d\s+/i,
          /^wget\s+.*--post/i,
          /^ssh\s+/i,
          /^scp\s+/i,
          /^rsync\s+/i,
        ],
        defaultRisk: RISK_LEVEL.HIGH,
      },

      // System config - critical risk
      {
        category: OPERATION_CATEGORY.SYSTEM_CONFIG,
        patterns: [
          /^chmod\s+/i,
          /^chown\s+/i,
          /^chgrp\s+/i,
          /^sudo\s+/i,
          /^su\s+/i,
          /^systemctl\s+/i,
          /^service\s+/i,
          /^crontab\s+/i,
          /^visudo\s+/i,
        ],
        defaultRisk: RISK_LEVEL.CRITICAL,
      },

      // Credential access - critical risk
      {
        category: OPERATION_CATEGORY.CREDENTIAL_ACCESS,
        patterns: [
          /\.env/i,
          /\.ssh/i,
          /\.aws/i,
          /credentials/i,
          /secrets/i,
          /\.netrc/i,
          /\.pgpass/i,
          /keychain/i,
          /password/i,
          /api[_-]?key/i,
        ],
        defaultRisk: RISK_LEVEL.CRITICAL,
      },

      // Database operations
      {
        category: OPERATION_CATEGORY.DATABASE_READ,
        patterns: [
          /^SELECT\s+/i,
          /^SHOW\s+/i,
          /^DESCRIBE\s+/i,
          /^EXPLAIN\s+/i,
        ],
        defaultRisk: RISK_LEVEL.SAFE,
      },

      {
        category: OPERATION_CATEGORY.DATABASE_WRITE,
        patterns: [
          /^INSERT\s+/i,
          /^UPDATE\s+/i,
          /^DELETE\s+/i,
          /^DROP\s+/i,
          /^ALTER\s+/i,
          /^TRUNCATE\s+/i,
          /^CREATE\s+/i,
        ],
        defaultRisk: RISK_LEVEL.HIGH,
      },

      // Add custom patterns
      ...this.customPatterns,
    ];
  }

  /**
   * Classify an operation
   * @param {string|object} operation - Operation to classify
   * @returns {object} Classification result
   */
  classify(operation) {
    const operationStr = typeof operation === 'string'
      ? operation
      : operation.command || operation.action || JSON.stringify(operation);

    // Check blocklist first
    if (this._isBlocked(operationStr)) {
      return {
        operation: operationStr,
        category: OPERATION_CATEGORY.UNKNOWN,
        risk: RISK_LEVEL.CRITICAL,
        blocked: true,
        reason: 'Operation is on blocklist',
        autoApprove: false,
      };
    }

    // Check allowlist
    if (this._isAllowed(operationStr)) {
      return {
        operation: operationStr,
        category: this._detectCategory(operationStr),
        risk: RISK_LEVEL.SAFE,
        blocked: false,
        reason: 'Operation is on allowlist',
        autoApprove: true,
      };
    }

    // Classify by patterns
    const classification = this._classifyByPatterns(operationStr);

    // Apply risk modifiers
    const modifiedRisk = this._applyRiskModifiers(operationStr, classification.risk);

    return {
      operation: operationStr,
      category: classification.category,
      risk: modifiedRisk,
      blocked: false,
      reason: classification.reason,
      autoApprove: this._shouldAutoApprove(modifiedRisk),
      patterns: classification.matchedPatterns,
    };
  }

  /**
   * Check if operation is blocked
   * @param {string} operation
   * @returns {boolean}
   */
  _isBlocked(operation) {
    for (const blocked of this.blocklist) {
      if (operation.includes(blocked)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if operation is allowed
   * @param {string} operation
   * @returns {boolean}
   */
  _isAllowed(operation) {
    for (const allowed of this.allowlist) {
      if (operation.includes(allowed)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Detect operation category
   * @param {string} operation
   * @returns {string}
   */
  _detectCategory(operation) {
    for (const patternGroup of this.patterns) {
      for (const pattern of patternGroup.patterns) {
        if (pattern.test(operation)) {
          return patternGroup.category;
        }
      }
    }
    return OPERATION_CATEGORY.UNKNOWN;
  }

  /**
   * Classify operation by patterns
   * @param {string} operation
   * @returns {object}
   */
  _classifyByPatterns(operation) {
    const matchedPatterns = [];
    let highestRisk = RISK_LEVEL.SAFE;
    let category = OPERATION_CATEGORY.UNKNOWN;

    for (const patternGroup of this.patterns) {
      for (const pattern of patternGroup.patterns) {
        if (pattern.test(operation)) {
          matchedPatterns.push({
            pattern: pattern.toString(),
            category: patternGroup.category,
            risk: patternGroup.defaultRisk,
          });

          if (this._compareRisk(patternGroup.defaultRisk, highestRisk) > 0) {
            highestRisk = patternGroup.defaultRisk;
            category = patternGroup.category;
          }
        }
      }
    }

    return {
      category,
      risk: highestRisk,
      matchedPatterns,
      reason: matchedPatterns.length > 0
        ? `Matched ${matchedPatterns.length} pattern(s)`
        : 'No patterns matched',
    };
  }

  /**
   * Compare risk levels (returns positive if a > b)
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  _compareRisk(a, b) {
    const order = [
      RISK_LEVEL.SAFE,
      RISK_LEVEL.LOW,
      RISK_LEVEL.MEDIUM,
      RISK_LEVEL.HIGH,
      RISK_LEVEL.CRITICAL,
      RISK_LEVEL.UNKNOWN,
    ];
    return order.indexOf(a) - order.indexOf(b);
  }

  /**
   * Apply risk modifiers based on operation content
   * @param {string} operation
   * @param {string} baseRisk
   * @returns {string}
   */
  _applyRiskModifiers(operation, baseRisk) {
    let risk = baseRisk;

    // Dangerous flags
    const dangerousFlags = [
      { pattern: /-rf\s/i, escalate: RISK_LEVEL.CRITICAL },
      { pattern: /--force/i, escalate: RISK_LEVEL.HIGH },
      { pattern: /--no-preserve-root/i, escalate: RISK_LEVEL.CRITICAL },
      { pattern: /\*\*/g, escalate: RISK_LEVEL.HIGH }, // Glob patterns
      { pattern: /\/\s*$/i, escalate: RISK_LEVEL.HIGH }, // Root paths
    ];

    for (const { pattern, escalate } of dangerousFlags) {
      if (pattern.test(operation)) {
        if (this._compareRisk(escalate, risk) > 0) {
          risk = escalate;
        }
      }
    }

    // Paths that increase risk
    const sensitivePaths = [
      /\/etc\//i,
      /\/root\//i,
      /\/sys\//i,
      /\/proc\//i,
      /C:\\Windows/i,
      /C:\\Program Files/i,
    ];

    for (const pathPattern of sensitivePaths) {
      if (pathPattern.test(operation)) {
        if (this._compareRisk(RISK_LEVEL.HIGH, risk) > 0) {
          risk = RISK_LEVEL.HIGH;
        }
      }
    }

    return risk;
  }

  /**
   * Determine if operation should be auto-approved
   * @param {string} risk
   * @returns {boolean}
   */
  _shouldAutoApprove(risk) {
    return risk === RISK_LEVEL.SAFE || risk === RISK_LEVEL.LOW;
  }

  /**
   * Add pattern to classifier
   * @param {object} pattern
   */
  addPattern(pattern) {
    this.patterns.push(pattern);
  }

  /**
   * Add to allowlist
   * @param {string} operation
   */
  allow(operation) {
    this.allowlist.add(operation);
  }

  /**
   * Add to blocklist
   * @param {string} operation
   */
  block(operation) {
    this.blocklist.add(operation);
  }
}

module.exports = {
  OperationClassifier,
  RISK_LEVEL,
  OPERATION_CATEGORY,
};
