'use strict';

/**
 * Change Validator
 *
 * Validates and grills proposed changes before they are applied.
 * Part of Phase 32: Self-Grilling.
 */

const { BaseAgent, AGENT_PRIORITY } = require('../agents/base-agent');

/**
 * Validation result types
 */
const VALIDATION_RESULT = {
  APPROVED: 'approved',
  NEEDS_REVIEW: 'needs_review',
  REJECTED: 'rejected',
  NEEDS_CLARIFICATION: 'needs_clarification',
};

/**
 * Change risk categories
 */
const CHANGE_RISK = {
  SAFE: 'safe',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Change Validator Agent
 */
class ChangeValidatorAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Change Validator',
      type: 'change_validator',
      priority: AGENT_PRIORITY.HIGH,
      ...options,
    });

    this.strictMode = options.strictMode || false;
    this.requiredApprovals = options.requiredApprovals || 1;
  }

  async onExecute() {
    const { change, context: _context, previousState } = this.context;

    if (!change) {
      return { success: false, error: 'No change provided' };
    }

    try {
      // Analyze the change
      const analysis = this._analyzeChange(change, previousState);

      // Generate grill questions
      const questions = this._generateGrillQuestions(change, analysis);

      // Assess risk
      const riskAssessment = this._assessRisk(change, analysis);

      // Determine validation result
      const result = this._determineResult(analysis, riskAssessment);

      // Generate checklist
      const checklist = this._generateChecklist(change, analysis);

      return {
        success: true,
        result: result.status,
        reason: result.reason,
        analysis,
        riskAssessment,
        questions,
        checklist,
        summary: this._generateSummary(result, analysis, riskAssessment),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Analyze the proposed change
   * @param {object} change
   * @param {object} previousState
   * @returns {object}
   */
  _analyzeChange(change, previousState) {
    const analysis = {
      type: this._detectChangeType(change),
      scope: this._assessScope(change),
      impact: [],
      concerns: [],
      positives: [],
    };

    // Analyze impact
    analysis.impact = this._analyzeImpact(change, previousState);

    // Identify concerns
    analysis.concerns = this._identifyConcerns(change);

    // Identify positives
    analysis.positives = this._identifyPositives(change);

    return analysis;
  }

  /**
   * Detect the type of change
   * @param {object} change
   * @returns {string}
   */
  _detectChangeType(change) {
    const changeStr = typeof change === 'string' ? change : JSON.stringify(change);
    const changeLower = changeStr.toLowerCase();

    if (changeLower.includes('delete') || changeLower.includes('remove')) {
      return 'deletion';
    }
    if (changeLower.includes('add') || changeLower.includes('create') || changeLower.includes('new')) {
      return 'addition';
    }
    if (changeLower.includes('update') || changeLower.includes('modify') || changeLower.includes('change')) {
      return 'modification';
    }
    if (changeLower.includes('refactor') || changeLower.includes('restructure')) {
      return 'refactor';
    }
    if (changeLower.includes('fix') || changeLower.includes('bug')) {
      return 'bugfix';
    }

    return 'unknown';
  }

  /**
   * Assess the scope of change
   * @param {object} change
   * @returns {object}
   */
  _assessScope(change) {
    const scope = {
      level: 'local', // local, module, system, cross-system
      filesAffected: 0,
      linesChanged: 0,
      dependencies: [],
    };

    if (change.files) {
      scope.filesAffected = change.files.length;

      if (scope.filesAffected > 10) {
        scope.level = 'system';
      } else if (scope.filesAffected > 3) {
        scope.level = 'module';
      }
    }

    if (change.linesAdded !== undefined || change.linesRemoved !== undefined) {
      scope.linesChanged = (change.linesAdded || 0) + (change.linesRemoved || 0);
    }

    if (change.dependencies) {
      scope.dependencies = change.dependencies;
      if (scope.dependencies.length > 0) {
        scope.level = scope.level === 'local' ? 'module' : scope.level;
      }
    }

    return scope;
  }

  /**
   * Analyze impact of change
   * @param {object} change
   * @param {object} previousState
   * @returns {Array}
   */
  _analyzeImpact(change, _previousState) {
    const impacts = [];
    const changeStr = typeof change === 'string' ? change : JSON.stringify(change);

    // Direct impacts
    impacts.push({
      area: 'functionality',
      description: `Change affects ${this._detectChangeType(change)} operations`,
      severity: 'direct',
    });

    // API impacts
    if (changeStr.includes('api') || changeStr.includes('endpoint') || changeStr.includes('interface')) {
      impacts.push({
        area: 'api',
        description: 'May affect API consumers',
        severity: 'high',
      });
    }

    // Database impacts
    if (changeStr.includes('database') || changeStr.includes('schema') || changeStr.includes('migration')) {
      impacts.push({
        area: 'data',
        description: 'May affect data structures or integrity',
        severity: 'high',
      });
    }

    // Performance impacts
    if (changeStr.includes('performance') || changeStr.includes('cache') || changeStr.includes('index')) {
      impacts.push({
        area: 'performance',
        description: 'May affect system performance',
        severity: 'medium',
      });
    }

    // Security impacts
    if (changeStr.includes('security') || changeStr.includes('auth') || changeStr.includes('permission')) {
      impacts.push({
        area: 'security',
        description: 'May affect security posture',
        severity: 'critical',
      });
    }

    return impacts;
  }

  /**
   * Identify concerns about the change
   * @param {object} change
   * @returns {Array}
   */
  _identifyConcerns(change) {
    const concerns = [];
    const changeStr = typeof change === 'string' ? change : JSON.stringify(change);

    const concernPatterns = [
      { pattern: /breaking change/gi, concern: 'Breaking change may affect existing functionality' },
      { pattern: /temporary|hack|workaround/gi, concern: 'Contains temporary code that may accumulate technical debt' },
      { pattern: /hardcoded|magic number/gi, concern: 'Contains hardcoded values that reduce maintainability' },
      { pattern: /TODO|FIXME/gi, concern: 'Contains unresolved TODO items' },
      { pattern: /skip test|no test/gi, concern: 'May lack adequate test coverage' },
      { pattern: /force push|--force/gi, concern: 'Uses force operations that can lose history' },
      { pattern: /global|singleton/gi, concern: 'Uses global state that can cause issues' },
    ];

    for (const { pattern, concern } of concernPatterns) {
      if (pattern.test(changeStr)) {
        concerns.push({
          type: 'pattern',
          description: concern,
          severity: 'medium',
        });
      }
    }

    return concerns;
  }

  /**
   * Identify positive aspects of the change
   * @param {object} change
   * @returns {Array}
   */
  _identifyPositives(change) {
    const positives = [];
    const changeStr = typeof change === 'string' ? change : JSON.stringify(change);

    const positivePatterns = [
      { pattern: /test added|add test|with tests/gi, positive: 'Includes test coverage' },
      { pattern: /documented|add doc|with docs/gi, positive: 'Includes documentation' },
      { pattern: /refactor|clean up|improve/gi, positive: 'Improves code quality' },
      { pattern: /performance|optimize|faster/gi, positive: 'Improves performance' },
      { pattern: /security|secure|protect/gi, positive: 'Improves security' },
      { pattern: /simplif/gi, positive: 'Simplifies existing code' },
    ];

    for (const { pattern, positive } of positivePatterns) {
      if (pattern.test(changeStr)) {
        positives.push({
          type: 'pattern',
          description: positive,
        });
      }
    }

    return positives;
  }

  /**
   * Generate grill questions for the change
   * @param {object} change
   * @param {object} analysis
   * @returns {Array}
   */
  _generateGrillQuestions(change, analysis) {
    const questions = [];

    // Always ask these
    questions.push({
      question: 'Why is this change necessary?',
      purpose: 'Understand the motivation',
      required: true,
    });

    questions.push({
      question: 'What alternatives were considered?',
      purpose: 'Ensure best approach was chosen',
      required: true,
    });

    questions.push({
      question: 'How has this been tested?',
      purpose: 'Verify quality assurance',
      required: true,
    });

    // Type-specific questions
    switch (analysis.type) {
      case 'deletion':
        questions.push({
          question: 'What depends on the deleted code?',
          purpose: 'Identify breaking changes',
          required: true,
        });
        questions.push({
          question: 'Is there a deprecation period?',
          purpose: 'Ensure graceful transition',
          required: false,
        });
        break;

      case 'addition':
        questions.push({
          question: 'Does this duplicate existing functionality?',
          purpose: 'Avoid redundancy',
          required: true,
        });
        questions.push({
          question: 'What is the maintenance burden?',
          purpose: 'Consider long-term impact',
          required: false,
        });
        break;

      case 'modification':
        questions.push({
          question: 'Is this backwards compatible?',
          purpose: 'Identify migration needs',
          required: true,
        });
        break;

      case 'refactor':
        questions.push({
          question: 'What behavior changes, if any?',
          purpose: 'Ensure refactor is pure',
          required: true,
        });
        break;
    }

    // Scope-based questions
    if (analysis.scope.level === 'system' || analysis.scope.level === 'cross-system') {
      questions.push({
        question: 'Who needs to be notified of this change?',
        purpose: 'Coordinate with stakeholders',
        required: true,
      });
    }

    // Risk-based questions
    if (analysis.concerns.length > 0) {
      questions.push({
        question: `How will you address: ${analysis.concerns[0].description}?`,
        purpose: 'Mitigate identified concerns',
        required: true,
      });
    }

    return questions;
  }

  /**
   * Assess risk of the change
   * @param {object} change
   * @param {object} analysis
   * @returns {object}
   */
  _assessRisk(change, analysis) {
    let riskScore = 20; // Base risk

    // Type-based risk
    const typeRisk = {
      deletion: 30,
      modification: 20,
      addition: 10,
      refactor: 25,
      bugfix: 15,
      unknown: 40,
    };
    riskScore += typeRisk[analysis.type] || 20;

    // Scope-based risk
    const scopeRisk = {
      local: 0,
      module: 15,
      system: 30,
      'cross-system': 50,
    };
    riskScore += scopeRisk[analysis.scope.level] || 10;

    // Concern-based risk
    riskScore += analysis.concerns.length * 10;

    // Positive-based reduction
    riskScore -= analysis.positives.length * 5;

    // Normalize
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Determine risk level
    let level;
    if (riskScore <= 20) level = CHANGE_RISK.SAFE;
    else if (riskScore <= 40) level = CHANGE_RISK.LOW;
    else if (riskScore <= 60) level = CHANGE_RISK.MEDIUM;
    else if (riskScore <= 80) level = CHANGE_RISK.HIGH;
    else level = CHANGE_RISK.CRITICAL;

    return {
      score: riskScore,
      level,
      factors: {
        typeContribution: typeRisk[analysis.type] || 20,
        scopeContribution: scopeRisk[analysis.scope.level] || 10,
        concernsCount: analysis.concerns.length,
        positivesCount: analysis.positives.length,
      },
    };
  }

  /**
   * Determine validation result
   * @param {object} analysis
   * @param {object} riskAssessment
   * @returns {object}
   */
  _determineResult(analysis, riskAssessment) {
    if (riskAssessment.level === CHANGE_RISK.CRITICAL) {
      return {
        status: VALIDATION_RESULT.REJECTED,
        reason: 'Change is too risky - requires significant review and approval',
      };
    }

    if (riskAssessment.level === CHANGE_RISK.HIGH) {
      return {
        status: VALIDATION_RESULT.NEEDS_REVIEW,
        reason: 'High-risk change requires additional review',
      };
    }

    if (analysis.concerns.length > 3) {
      return {
        status: VALIDATION_RESULT.NEEDS_CLARIFICATION,
        reason: 'Multiple concerns need to be addressed',
      };
    }

    if (riskAssessment.level === CHANGE_RISK.MEDIUM && this.strictMode) {
      return {
        status: VALIDATION_RESULT.NEEDS_REVIEW,
        reason: 'Medium-risk change in strict mode requires review',
      };
    }

    return {
      status: VALIDATION_RESULT.APPROVED,
      reason: 'Change passes validation checks',
    };
  }

  /**
   * Generate validation checklist
   * @param {object} change
   * @param {object} analysis
   * @returns {Array}
   */
  _generateChecklist(change, analysis) {
    const checklist = [
      { item: 'Code has been reviewed', required: true, checked: false },
      { item: 'Tests have been run', required: true, checked: false },
      { item: 'Documentation updated', required: false, checked: false },
    ];

    if (analysis.type === 'deletion') {
      checklist.push({ item: 'Dependents have been notified', required: true, checked: false });
    }

    if (analysis.scope.level !== 'local') {
      checklist.push({ item: 'Integration tests passed', required: true, checked: false });
    }

    if (analysis.concerns.length > 0) {
      checklist.push({ item: 'All concerns addressed', required: true, checked: false });
    }

    return checklist;
  }

  /**
   * Generate validation summary
   * @param {object} result
   * @param {object} analysis
   * @param {object} riskAssessment
   * @returns {string}
   */
  _generateSummary(result, analysis, riskAssessment) {
    const lines = [];

    lines.push(`## Change Validation Summary`);
    lines.push(``);
    lines.push(`**Result:** ${result.status.toUpperCase()}`);
    lines.push(`**Reason:** ${result.reason}`);
    lines.push(``);
    lines.push(`### Analysis`);
    lines.push(`- **Type:** ${analysis.type}`);
    lines.push(`- **Scope:** ${analysis.scope.level}`);
    lines.push(`- **Risk Score:** ${riskAssessment.score}/100 (${riskAssessment.level})`);
    lines.push(``);

    if (analysis.concerns.length > 0) {
      lines.push(`### Concerns`);
      for (const concern of analysis.concerns) {
        lines.push(`- ${concern.description}`);
      }
      lines.push(``);
    }

    if (analysis.positives.length > 0) {
      lines.push(`### Positives`);
      for (const positive of analysis.positives) {
        lines.push(`- ${positive.description}`);
      }
    }

    return lines.join('\n');
  }
}

module.exports = {
  ChangeValidatorAgent,
  VALIDATION_RESULT,
  CHANGE_RISK,
};
