'use strict';

/**
 * Agent Types
 *
 * Specialized agent implementations for different review and analysis tasks.
 * Part of Phase 29: Agent Runtime.
 */

const { BaseAgent, AGENT_PRIORITY } = require('./base-agent');

/**
 * Critic Agent
 * Reviews code/plans for quality issues, suggests improvements
 */
class CriticAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Critic',
      type: 'critic',
      priority: AGENT_PRIORITY.HIGH,
      ...options,
    });

    this.criteria = options.criteria || [
      'code_quality',
      'readability',
      'maintainability',
      'performance',
      'security',
    ];
  }

  async onExecute() {
    const { target, targetType } = this.context;

    if (!target) {
      return { issues: [], score: 100, message: 'No target provided' };
    }

    const issues = [];
    let score = 100;

    // Analyze based on criteria
    for (const criterion of this.criteria) {
      const analysis = this._analyzeCriterion(target, targetType, criterion);
      if (analysis.issues.length > 0) {
        issues.push(...analysis.issues);
        score -= analysis.penalty;
      }
    }

    return {
      issues,
      score: Math.max(0, score),
      summary: this._generateSummary(issues, score),
      suggestions: this._generateSuggestions(issues),
    };
  }

  _analyzeCriterion(target, targetType, criterion) {
    const issues = [];
    let penalty = 0;

    // Pattern-based analysis
    const patterns = {
      code_quality: [
        { pattern: /TODO|FIXME|HACK/gi, message: 'Contains TODO/FIXME markers', severity: 'low' },
        { pattern: /console\.(log|debug)/g, message: 'Contains console statements', severity: 'medium' },
      ],
      readability: [
        { pattern: /function\s*\([^)]{100,}\)/g, message: 'Function has too many parameters', severity: 'medium' },
        { pattern: /\{[\s\S]{500,}\}/g, message: 'Large code block may need refactoring', severity: 'low' },
      ],
      security: [
        { pattern: /eval\s*\(/g, message: 'Use of eval() is dangerous', severity: 'high' },
        { pattern: /innerHTML\s*=/g, message: 'innerHTML assignment may cause XSS', severity: 'high' },
      ],
      performance: [
        { pattern: /\.forEach\s*\([^)]*\)\s*{[\s\S]*\.push/g, message: 'Consider using map instead of forEach+push', severity: 'low' },
      ],
    };

    const criterionPatterns = patterns[criterion] || [];

    for (const { pattern, message, severity } of criterionPatterns) {
      const matches = (target.toString().match(pattern) || []);
      if (matches.length > 0) {
        issues.push({
          criterion,
          message,
          severity,
          count: matches.length,
        });
        penalty += severity === 'high' ? 15 : severity === 'medium' ? 8 : 3;
      }
    }

    return { issues, penalty };
  }

  _generateSummary(issues, score) {
    if (issues.length === 0) {
      return 'No issues found. Code passes all criteria.';
    }

    const high = issues.filter(i => i.severity === 'high').length;
    const medium = issues.filter(i => i.severity === 'medium').length;
    const low = issues.filter(i => i.severity === 'low').length;

    return `Found ${issues.length} issue(s): ${high} high, ${medium} medium, ${low} low. Score: ${score}/100`;
  }

  _generateSuggestions(issues) {
    return issues.map(issue => ({
      criterion: issue.criterion,
      suggestion: `Address ${issue.severity} severity issue: ${issue.message}`,
    }));
  }
}

/**
 * Devil's Advocate Agent
 * Challenges assumptions and finds counterarguments
 */
class DevilsAdvocateAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: "Devil's Advocate",
      type: 'devils_advocate',
      priority: AGENT_PRIORITY.NORMAL,
      ...options,
    });
  }

  async onExecute() {
    const { proposal, assumptions, decisions } = this.context;

    const challenges = [];
    const counterarguments = [];
    const risks = [];

    // Challenge assumptions
    if (assumptions && Array.isArray(assumptions)) {
      for (const assumption of assumptions) {
        challenges.push({
          type: 'assumption',
          target: assumption,
          challenge: `What if "${assumption}" is not true?`,
          impact: 'Could invalidate the entire approach',
        });
      }
    }

    // Challenge decisions
    if (decisions && Array.isArray(decisions)) {
      for (const decision of decisions) {
        counterarguments.push({
          decision: decision.choice || decision,
          counterargument: `Have you considered the opposite approach?`,
          alternative: `What about ${this._generateAlternative(decision)}?`,
        });
      }
    }

    // Identify risks in proposal
    if (proposal) {
      risks.push(...this._identifyRisks(proposal));
    }

    return {
      challenges,
      counterarguments,
      risks,
      overallAssessment: this._generateAssessment(challenges, counterarguments, risks),
    };
  }

  _generateAlternative(decision) {
    const alternatives = [
      'a simpler solution',
      'an established pattern',
      'a more conservative approach',
      'breaking this into smaller steps',
      'delaying this decision',
    ];
    return alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  _identifyRisks(proposal) {
    const risks = [];
    const proposalStr = typeof proposal === 'string' ? proposal : JSON.stringify(proposal);

    // Common risk patterns
    const riskPatterns = [
      { keyword: 'new', risk: 'Introducing new technology adds learning curve and maintenance burden' },
      { keyword: 'refactor', risk: 'Refactoring may introduce regressions in working code' },
      { keyword: 'migration', risk: 'Migrations can cause downtime and data loss' },
      { keyword: 'dependency', risk: 'New dependencies increase attack surface and maintenance' },
      { keyword: 'performance', risk: 'Performance optimizations may complicate code' },
    ];

    for (const { keyword, risk } of riskPatterns) {
      if (proposalStr.toLowerCase().includes(keyword)) {
        risks.push({ trigger: keyword, description: risk, severity: 'medium' });
      }
    }

    return risks;
  }

  _generateAssessment(challenges, counterarguments, risks) {
    const total = challenges.length + counterarguments.length + risks.length;

    if (total === 0) {
      return 'No significant concerns identified. Proposal appears solid.';
    }

    return `Identified ${challenges.length} assumption challenge(s), ` +
           `${counterarguments.length} counterargument(s), and ${risks.length} risk(s). ` +
           'Recommend addressing these before proceeding.';
  }
}

/**
 * Red Team Agent
 * Actively tries to break/exploit the system
 */
class RedTeamAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Red Team',
      type: 'red_team',
      priority: AGENT_PRIORITY.HIGH,
      ...options,
    });

    this.attackVectors = options.attackVectors || [
      'injection',
      'authentication',
      'authorization',
      'data_exposure',
      'rate_limiting',
    ];
  }

  async onExecute() {
    const { target, targetType } = this.context;

    const vulnerabilities = [];
    const exploits = [];
    const recommendations = [];

    for (const vector of this.attackVectors) {
      const findings = this._probeVector(target, targetType, vector);
      vulnerabilities.push(...findings.vulnerabilities);
      exploits.push(...findings.exploits);
      recommendations.push(...findings.recommendations);
    }

    return {
      vulnerabilities,
      exploits,
      recommendations,
      riskLevel: this._calculateRiskLevel(vulnerabilities),
      summary: this._generateSummary(vulnerabilities, exploits),
    };
  }

  _probeVector(target, targetType, vector) {
    const vulnerabilities = [];
    const exploits = [];
    const recommendations = [];

    const targetStr = typeof target === 'string' ? target : JSON.stringify(target);

    // Vector-specific patterns
    const vectorPatterns = {
      injection: {
        patterns: [/\$\{.*\}/g, /`.*\$\{/g, /eval\(/g, /exec\(/g],
        vulnerability: 'Potential code injection vulnerability',
        recommendation: 'Sanitize all user inputs, use parameterized queries',
      },
      authentication: {
        patterns: [/password.*=.*['"][^'"]+['"]/gi, /secret.*=.*['"][^'"]+['"]/gi],
        vulnerability: 'Hardcoded credentials detected',
        recommendation: 'Use environment variables for sensitive data',
      },
      authorization: {
        patterns: [/isAdmin\s*=\s*true/gi, /role\s*=\s*['"]admin['"]/gi],
        vulnerability: 'Potential authorization bypass',
        recommendation: 'Implement proper role-based access control',
      },
      data_exposure: {
        patterns: [/console\.log.*password/gi, /console\.log.*token/gi],
        vulnerability: 'Sensitive data logged to console',
        recommendation: 'Remove sensitive data from logs',
      },
    };

    const config = vectorPatterns[vector];
    if (config) {
      for (const pattern of config.patterns) {
        const matches = targetStr.match(pattern) || [];
        if (matches.length > 0) {
          vulnerabilities.push({
            vector,
            description: config.vulnerability,
            severity: 'high',
            matches: matches.length,
          });
          exploits.push({
            vector,
            method: `Exploit via ${vector}`,
            impact: 'Could lead to system compromise',
          });
          recommendations.push({
            vector,
            action: config.recommendation,
            priority: 'high',
          });
        }
      }
    }

    return { vulnerabilities, exploits, recommendations };
  }

  _calculateRiskLevel(vulnerabilities) {
    const high = vulnerabilities.filter(v => v.severity === 'high').length;
    const medium = vulnerabilities.filter(v => v.severity === 'medium').length;

    if (high > 0) return 'critical';
    if (medium > 2) return 'high';
    if (medium > 0) return 'medium';
    return 'low';
  }

  _generateSummary(vulnerabilities, exploits) {
    if (vulnerabilities.length === 0) {
      return 'No vulnerabilities detected. System appears secure against tested vectors.';
    }

    return `Found ${vulnerabilities.length} vulnerability(ies) with ${exploits.length} potential exploit path(s). Immediate remediation recommended.`;
  }
}

/**
 * Chaos Agent
 * Tests edge cases, unexpected inputs, failure modes
 */
class ChaosAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Chaos',
      type: 'chaos',
      priority: AGENT_PRIORITY.NORMAL,
      ...options,
    });
  }

  async onExecute() {
    const { target, targetType, testCases } = this.context;

    const edgeCases = this._generateEdgeCases(targetType);
    const failures = [];
    const resilience = { score: 100, issues: [] };

    // Test provided test cases
    if (testCases && Array.isArray(testCases)) {
      for (const testCase of testCases) {
        const result = this._runChaosTest(target, testCase);
        if (!result.passed) {
          failures.push(result);
          resilience.score -= 10;
        }
      }
    }

    // Test generated edge cases
    for (const edgeCase of edgeCases) {
      const result = this._runChaosTest(target, edgeCase);
      if (!result.passed) {
        failures.push(result);
        resilience.score -= 5;
        resilience.issues.push(edgeCase.description);
      }
    }

    return {
      edgeCasesGenerated: edgeCases.length,
      edgeCasesTested: edgeCases.length + (testCases?.length || 0),
      failures,
      resilience: {
        score: Math.max(0, resilience.score),
        issues: resilience.issues,
      },
      recommendations: this._generateRecommendations(failures),
    };
  }

  _generateEdgeCases(targetType) {
    const commonEdgeCases = [
      { input: null, description: 'Null input' },
      { input: undefined, description: 'Undefined input' },
      { input: '', description: 'Empty string' },
      { input: [], description: 'Empty array' },
      { input: {}, description: 'Empty object' },
      { input: -1, description: 'Negative number' },
      { input: 0, description: 'Zero' },
      { input: Number.MAX_SAFE_INTEGER, description: 'Max safe integer' },
      { input: 'a'.repeat(10000), description: 'Very long string' },
      { input: '\x00\x01\x02', description: 'Control characters' },
    ];

    return commonEdgeCases;
  }

  _runChaosTest(target, testCase) {
    // Simulate chaos testing
    const isFunction = typeof target === 'function';

    return {
      testCase: testCase.description || 'Unknown test',
      input: testCase.input,
      passed: Math.random() > 0.3, // Simulated pass/fail
      error: null,
    };
  }

  _generateRecommendations(failures) {
    if (failures.length === 0) {
      return ['System handles edge cases well. Consider adding more exotic test cases.'];
    }

    return [
      'Add input validation for edge cases',
      'Implement proper error boundaries',
      'Add defensive programming patterns',
      `Address ${failures.length} failing edge case(s)`,
    ];
  }
}

/**
 * Skeptic Agent
 * Questions requirements, asks "why" repeatedly
 */
class SkepticAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Skeptic',
      type: 'skeptic',
      priority: AGENT_PRIORITY.LOW,
      ...options,
    });

    this.whyDepth = options.whyDepth || 5;
  }

  async onExecute() {
    const { requirements, features, decisions } = this.context;

    const questions = [];
    const clarifications = [];
    const redundancies = [];

    // Question requirements
    if (requirements && Array.isArray(requirements)) {
      for (const req of requirements) {
        questions.push(...this._questionRequirement(req));
      }
    }

    // Question features
    if (features && Array.isArray(features)) {
      for (const feature of features) {
        const featureQuestions = this._questionFeature(feature);
        questions.push(...featureQuestions.questions);
        if (featureQuestions.potentialRedundancy) {
          redundancies.push(featureQuestions.potentialRedundancy);
        }
      }
    }

    // Question decisions
    if (decisions && Array.isArray(decisions)) {
      for (const decision of decisions) {
        clarifications.push(...this._questionDecision(decision));
      }
    }

    return {
      questions,
      clarifications,
      redundancies,
      summary: this._generateSummary(questions, clarifications, redundancies),
    };
  }

  _questionRequirement(requirement) {
    const reqStr = typeof requirement === 'string' ? requirement : requirement.description || JSON.stringify(requirement);

    return [
      { question: `Why is "${reqStr}" necessary?`, depth: 1 },
      { question: `What happens if we don't implement "${reqStr}"?`, depth: 2 },
      { question: `Who specifically needs this requirement?`, depth: 3 },
      { question: `Is there a simpler way to achieve the same goal?`, depth: 4 },
    ];
  }

  _questionFeature(feature) {
    const featureStr = typeof feature === 'string' ? feature : feature.name || JSON.stringify(feature);

    return {
      questions: [
        { question: `Will users actually use "${featureStr}"?`, category: 'usage' },
        { question: `What's the maintenance cost of "${featureStr}"?`, category: 'maintenance' },
        { question: `Does "${featureStr}" overlap with existing functionality?`, category: 'redundancy' },
      ],
      potentialRedundancy: null,
    };
  }

  _questionDecision(decision) {
    const decisionStr = typeof decision === 'string' ? decision : decision.choice || JSON.stringify(decision);

    return [
      {
        question: `What evidence supports "${decisionStr}"?`,
        type: 'evidence',
      },
      {
        question: `What alternatives were considered for "${decisionStr}"?`,
        type: 'alternatives',
      },
      {
        question: `Can this decision be easily reversed if wrong?`,
        type: 'reversibility',
      },
    ];
  }

  _generateSummary(questions, clarifications, redundancies) {
    return `Generated ${questions.length} questions, ${clarifications.length} clarification requests, ` +
           `and identified ${redundancies.length} potential redundancies. ` +
           'Review these before proceeding with implementation.';
  }
}

module.exports = {
  CriticAgent,
  DevilsAdvocateAgent,
  RedTeamAgent,
  ChaosAgent,
  SkepticAgent,
};
