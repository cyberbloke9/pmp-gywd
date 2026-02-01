'use strict';

/**
 * Plan Challenger
 *
 * Questions assumptions and validates plans before execution.
 * Part of Phase 32: Self-Grilling.
 */

const { BaseAgent, AGENT_PRIORITY } = require('../agents/base-agent');

/**
 * Challenge types
 */
const CHALLENGE_TYPE = {
  ASSUMPTION: 'assumption',
  DEPENDENCY: 'dependency',
  SCOPE: 'scope',
  FEASIBILITY: 'feasibility',
  RISK: 'risk',
  ALTERNATIVE: 'alternative',
};

/**
 * Challenge severity
 */
const CHALLENGE_SEVERITY = {
  BLOCKER: 'blocker',
  MAJOR: 'major',
  MINOR: 'minor',
  QUESTION: 'question',
};

/**
 * Plan Challenger Agent
 */
class PlanChallengerAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Plan Challenger',
      type: 'plan_challenger',
      priority: AGENT_PRIORITY.HIGH,
      ...options,
    });

    this.challengeDepth = options.challengeDepth || 3;
    this.aggressiveness = options.aggressiveness || 'moderate'; // mild, moderate, aggressive
  }

  async onExecute() {
    const { plan, context, assumptions } = this.context;

    if (!plan) {
      return { success: false, error: 'No plan provided' };
    }

    try {
      const challenges = [];

      // Challenge assumptions
      const assumptionChallenges = this._challengeAssumptions(plan, assumptions || []);
      challenges.push(...assumptionChallenges);

      // Challenge dependencies
      const depChallenges = this._challengeDependencies(plan);
      challenges.push(...depChallenges);

      // Challenge scope
      const scopeChallenges = this._challengeScope(plan, context);
      challenges.push(...scopeChallenges);

      // Challenge feasibility
      const feasibilityChallenges = this._challengeFeasibility(plan);
      challenges.push(...feasibilityChallenges);

      // Identify risks
      const risks = this._identifyRisks(plan);
      challenges.push(...risks);

      // Suggest alternatives
      const alternatives = this._suggestAlternatives(plan, challenges);

      // Calculate confidence score
      const confidence = this._calculateConfidence(challenges);

      return {
        success: true,
        challenges,
        alternatives,
        confidence,
        recommendation: this._generateRecommendation(challenges, confidence),
        summary: this._generateSummary(challenges, confidence),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Challenge stated and implicit assumptions
   * @param {object} plan
   * @param {Array} statedAssumptions
   * @returns {Array}
   */
  _challengeAssumptions(plan, statedAssumptions) {
    const challenges = [];
    const planStr = typeof plan === 'string' ? plan : JSON.stringify(plan);

    // Challenge stated assumptions
    for (const assumption of statedAssumptions) {
      challenges.push({
        type: CHALLENGE_TYPE.ASSUMPTION,
        severity: CHALLENGE_SEVERITY.QUESTION,
        target: assumption,
        challenge: `What evidence supports the assumption: "${assumption}"?`,
        whyItMatters: 'If this assumption is wrong, the plan may fail',
        questions: [
          `How was this assumption validated?`,
          `What would invalidate this assumption?`,
          `Is there a way to test this before proceeding?`,
        ],
      });
    }

    // Detect implicit assumptions
    const implicitAssumptions = this._detectImplicitAssumptions(planStr);
    for (const implicit of implicitAssumptions) {
      challenges.push({
        type: CHALLENGE_TYPE.ASSUMPTION,
        severity: CHALLENGE_SEVERITY.MAJOR,
        target: implicit.assumption,
        challenge: `Implicit assumption detected: "${implicit.assumption}"`,
        whyItMatters: implicit.risk,
        questions: implicit.questions,
      });
    }

    return challenges;
  }

  /**
   * Detect implicit assumptions in plan
   * @param {string} planStr
   * @returns {Array}
   */
  _detectImplicitAssumptions(planStr) {
    const assumptions = [];
    const planLower = planStr.toLowerCase();

    const patterns = [
      {
        pattern: /will work|should work|can work/gi,
        assumption: 'The solution will work as expected',
        risk: 'Untested assumptions about functionality',
        questions: ['Have similar approaches been tried?', 'What could prevent this from working?'],
      },
      {
        pattern: /easy|simple|straightforward|quick/gi,
        assumption: 'The implementation will be straightforward',
        risk: 'Underestimating complexity',
        questions: ['What hidden complexities might exist?', 'What edge cases need handling?'],
      },
      {
        pattern: /existing|current|already/gi,
        assumption: 'Existing systems/code will support this',
        risk: 'Dependencies on existing systems',
        questions: ['Is the existing system documented?', 'Are there version compatibility issues?'],
      },
      {
        pattern: /user|users|customer/gi,
        assumption: 'Users will adopt/use this as intended',
        risk: 'User behavior assumptions',
        questions: ['Has this been validated with users?', 'What if users use it differently?'],
      },
      {
        pattern: /performance|fast|efficient/gi,
        assumption: 'Performance will be acceptable',
        risk: 'Performance assumptions without benchmarks',
        questions: ['What are the performance requirements?', 'How will you measure performance?'],
      },
      {
        pattern: /secure|safe|protected/gi,
        assumption: 'Security is adequately addressed',
        risk: 'Security assumptions without audit',
        questions: ['What threat model was used?', 'Has this been security reviewed?'],
      },
    ];

    for (const { pattern, assumption, risk, questions } of patterns) {
      if (pattern.test(planStr)) {
        assumptions.push({ assumption, risk, questions });
      }
    }

    return assumptions;
  }

  /**
   * Challenge dependencies in the plan
   * @param {object} plan
   * @returns {Array}
   */
  _challengeDependencies(plan) {
    const challenges = [];

    // Extract dependencies from plan
    const deps = plan.dependencies || plan.requires || [];
    const planStr = typeof plan === 'string' ? plan : JSON.stringify(plan);

    // Look for dependency keywords
    const depKeywords = [
      { keyword: 'require', severity: CHALLENGE_SEVERITY.MAJOR },
      { keyword: 'depend', severity: CHALLENGE_SEVERITY.MAJOR },
      { keyword: 'need', severity: CHALLENGE_SEVERITY.MINOR },
      { keyword: 'must have', severity: CHALLENGE_SEVERITY.BLOCKER },
      { keyword: 'prerequisite', severity: CHALLENGE_SEVERITY.BLOCKER },
    ];

    for (const { keyword, severity } of depKeywords) {
      if (planStr.toLowerCase().includes(keyword)) {
        challenges.push({
          type: CHALLENGE_TYPE.DEPENDENCY,
          severity,
          challenge: `Plan mentions "${keyword}" - ensure all dependencies are identified`,
          whyItMatters: 'Missing dependencies can block progress',
          questions: [
            'Are all dependencies documented?',
            'Are they available and working?',
            'What happens if a dependency fails?',
          ],
        });
      }
    }

    // Challenge each explicit dependency
    for (const dep of deps) {
      challenges.push({
        type: CHALLENGE_TYPE.DEPENDENCY,
        severity: CHALLENGE_SEVERITY.QUESTION,
        target: typeof dep === 'string' ? dep : dep.name || JSON.stringify(dep),
        challenge: `Is dependency "${dep}" verified and available?`,
        questions: [
          'Is this the correct version?',
          'Is it actively maintained?',
          'What if this becomes unavailable?',
        ],
      });
    }

    return challenges;
  }

  /**
   * Challenge scope of the plan
   * @param {object} plan
   * @param {object} context
   * @returns {Array}
   */
  _challengeScope(plan, context = {}) {
    const challenges = [];
    const planStr = typeof plan === 'string' ? plan : JSON.stringify(plan);

    // Scope creep indicators
    const scopeCreepKeywords = [
      'also', 'and then', 'while we\'re at it', 'might as well',
      'in addition', 'plus', 'along with', 'as well as',
    ];

    for (const keyword of scopeCreepKeywords) {
      if (planStr.toLowerCase().includes(keyword)) {
        challenges.push({
          type: CHALLENGE_TYPE.SCOPE,
          severity: CHALLENGE_SEVERITY.MINOR,
          challenge: `Potential scope creep detected: "${keyword}"`,
          whyItMatters: 'Scope creep increases complexity and risk',
          questions: [
            'Is this addition essential to the core goal?',
            'Can this be done separately later?',
            'What is the MVP scope?',
          ],
        });
        break; // Only one scope creep warning
      }
    }

    // Check for overly ambitious scope
    const taskCount = (planStr.match(/\btask\b|\bstep\b|\bphase\b/gi) || []).length;
    if (taskCount > 10) {
      challenges.push({
        type: CHALLENGE_TYPE.SCOPE,
        severity: CHALLENGE_SEVERITY.MAJOR,
        challenge: `Large scope detected: ${taskCount} tasks/steps mentioned`,
        whyItMatters: 'Large scopes are harder to estimate and execute',
        questions: [
          'Can this be broken into smaller deliverables?',
          'What is the minimum viable scope?',
          'Which tasks are truly essential?',
        ],
      });
    }

    return challenges;
  }

  /**
   * Challenge feasibility of the plan
   * @param {object} plan
   * @returns {Array}
   */
  _challengeFeasibility(plan) {
    const challenges = [];
    const planStr = typeof plan === 'string' ? plan : JSON.stringify(plan);

    // Technical feasibility concerns
    const technicalConcerns = [
      { pattern: /new technology|cutting edge|experimental/gi, concern: 'Using unproven technology' },
      { pattern: /never been done|first time|innovative/gi, concern: 'Attempting something unprecedented' },
      { pattern: /complex|complicated|intricate/gi, concern: 'High complexity' },
      { pattern: /integrate|integration/gi, concern: 'Integration challenges' },
      { pattern: /migrate|migration/gi, concern: 'Data/system migration risks' },
    ];

    for (const { pattern, concern } of technicalConcerns) {
      if (pattern.test(planStr)) {
        challenges.push({
          type: CHALLENGE_TYPE.FEASIBILITY,
          severity: CHALLENGE_SEVERITY.MAJOR,
          challenge: `Feasibility concern: ${concern}`,
          whyItMatters: 'May require more effort or fail entirely',
          questions: [
            'What proof-of-concept exists?',
            'Who has expertise in this area?',
            'What is the fallback plan?',
          ],
        });
      }
    }

    return challenges;
  }

  /**
   * Identify risks in the plan
   * @param {object} plan
   * @returns {Array}
   */
  _identifyRisks(plan) {
    const challenges = [];
    const planStr = typeof plan === 'string' ? plan : JSON.stringify(plan);

    const riskIndicators = [
      { pattern: /deadline|urgent|asap|rush/gi, risk: 'Time pressure may compromise quality' },
      { pattern: /budget|cost|expensive/gi, risk: 'Financial constraints may limit options' },
      { pattern: /team|resource|capacity/gi, risk: 'Resource availability risks' },
      { pattern: /third.?party|external|vendor/gi, risk: 'External dependency risks' },
      { pattern: /legacy|old|deprecated/gi, risk: 'Technical debt risks' },
    ];

    for (const { pattern, risk } of riskIndicators) {
      if (pattern.test(planStr)) {
        challenges.push({
          type: CHALLENGE_TYPE.RISK,
          severity: CHALLENGE_SEVERITY.MAJOR,
          challenge: risk,
          whyItMatters: 'Unmitigated risks can derail the project',
          questions: [
            'How will this risk be mitigated?',
            'What is the contingency plan?',
            'Who is responsible for monitoring this risk?',
          ],
        });
      }
    }

    return challenges;
  }

  /**
   * Suggest alternatives based on challenges
   * @param {object} plan
   * @param {Array} challenges
   * @returns {Array}
   */
  _suggestAlternatives(plan, challenges) {
    const alternatives = [];

    const hasBlockers = challenges.some(c => c.severity === CHALLENGE_SEVERITY.BLOCKER);
    const hasMajor = challenges.some(c => c.severity === CHALLENGE_SEVERITY.MAJOR);

    if (hasBlockers) {
      alternatives.push({
        type: CHALLENGE_TYPE.ALTERNATIVE,
        suggestion: 'Address blocking issues before proceeding',
        priority: 'critical',
        action: 'Resolve all blocker-severity challenges first',
      });
    }

    if (hasMajor) {
      alternatives.push({
        type: CHALLENGE_TYPE.ALTERNATIVE,
        suggestion: 'Consider a phased approach',
        priority: 'high',
        action: 'Break the plan into smaller, validated phases',
      });

      alternatives.push({
        type: CHALLENGE_TYPE.ALTERNATIVE,
        suggestion: 'Create a proof-of-concept first',
        priority: 'medium',
        action: 'Validate risky assumptions with a small experiment',
      });
    }

    if (challenges.length > 5) {
      alternatives.push({
        type: CHALLENGE_TYPE.ALTERNATIVE,
        suggestion: 'Simplify the plan',
        priority: 'medium',
        action: 'Reduce scope to minimize risks and unknowns',
      });
    }

    return alternatives;
  }

  /**
   * Calculate confidence score
   * @param {Array} challenges
   * @returns {object}
   */
  _calculateConfidence(challenges) {
    let score = 100;

    const penalties = {
      [CHALLENGE_SEVERITY.BLOCKER]: 30,
      [CHALLENGE_SEVERITY.MAJOR]: 15,
      [CHALLENGE_SEVERITY.MINOR]: 5,
      [CHALLENGE_SEVERITY.QUESTION]: 2,
    };

    for (const challenge of challenges) {
      score -= penalties[challenge.severity] || 0;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      level: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
      canProceed: score >= 50 && !challenges.some(c => c.severity === CHALLENGE_SEVERITY.BLOCKER),
    };
  }

  /**
   * Generate recommendation
   * @param {Array} challenges
   * @param {object} confidence
   * @returns {string}
   */
  _generateRecommendation(challenges, confidence) {
    if (challenges.length === 0) {
      return 'PROCEED: No significant challenges identified';
    }

    const blockers = challenges.filter(c => c.severity === CHALLENGE_SEVERITY.BLOCKER);
    const major = challenges.filter(c => c.severity === CHALLENGE_SEVERITY.MAJOR);

    if (blockers.length > 0) {
      return `STOP: ${blockers.length} blocking issue(s) must be resolved before proceeding`;
    }

    if (major.length > 3 || confidence.score < 50) {
      return `RECONSIDER: ${major.length} major issues and low confidence suggest rethinking the approach`;
    }

    if (major.length > 0) {
      return `PROCEED WITH CAUTION: Address ${major.length} major issue(s) before full commitment`;
    }

    return 'PROCEED: Minor issues can be addressed during execution';
  }

  /**
   * Generate summary
   * @param {Array} challenges
   * @param {object} confidence
   * @returns {string}
   */
  _generateSummary(challenges, confidence) {
    const lines = [];

    lines.push(`## Plan Challenge Summary`);
    lines.push(``);
    lines.push(`**Confidence Score:** ${confidence.score}/100 (${confidence.level})`);
    lines.push(`**Can Proceed:** ${confidence.canProceed ? 'Yes' : 'No'}`);
    lines.push(``);
    lines.push(`### Challenge Breakdown`);
    lines.push(``);

    const bySeverity = {};
    for (const challenge of challenges) {
      bySeverity[challenge.severity] = (bySeverity[challenge.severity] || 0) + 1;
    }

    for (const [severity, count] of Object.entries(bySeverity)) {
      lines.push(`- ${severity}: ${count}`);
    }

    lines.push(``);
    lines.push(`### Recommendation`);
    lines.push(``);
    lines.push(this._generateRecommendation(challenges, confidence));

    return lines.join('\n');
  }
}

module.exports = {
  PlanChallengerAgent,
  CHALLENGE_TYPE,
  CHALLENGE_SEVERITY,
};
