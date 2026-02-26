'use strict';

/**
 * Decision Griller
 *
 * Validates user decisions with probing questions and alternative analysis.
 * Part of Phase 32: Self-Grilling.
 */

const { BaseAgent, AGENT_PRIORITY } = require('../agents/base-agent');

/**
 * Decision confidence levels
 */
const DECISION_CONFIDENCE = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  UNCERTAIN: 'uncertain',
};

/**
 * Grill intensity levels
 */
const GRILL_INTENSITY = {
  LIGHT: 'light', // Just basic questions
  MODERATE: 'moderate', // Standard grilling
  INTENSE: 'intense', // Deep questioning
  EXTREME: 'extreme', // Challenge everything
};

/**
 * Decision Griller Agent
 */
class DecisionGrillerAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Decision Griller',
      type: 'decision_griller',
      priority: AGENT_PRIORITY.NORMAL,
      ...options,
    });

    this.intensity = options.intensity || GRILL_INTENSITY.MODERATE;
    this.maxQuestions = options.maxQuestions || 10;
  }

  async onExecute() {
    const { decision, alternatives, rationale, context: _context } = this.context;

    if (!decision) {
      return { success: false, error: 'No decision provided' };
    }

    try {
      // Analyze the decision
      const analysis = this._analyzeDecision(decision, rationale);

      // Generate grill questions based on intensity
      const questions = this._generateGrillQuestions(decision, analysis);

      // Analyze alternatives
      const alternativeAnalysis = this._analyzeAlternatives(decision, alternatives || []);

      // Generate devil's advocate arguments
      const counterarguments = this._generateCounterarguments(decision, rationale);

      // Assess decision quality
      const qualityAssessment = this._assessDecisionQuality(decision, analysis, rationale);

      // Generate "5 Whys" analysis
      const whyAnalysis = this._generateWhyAnalysis(decision, rationale);

      return {
        success: true,
        analysis,
        questions,
        alternativeAnalysis,
        counterarguments,
        qualityAssessment,
        whyAnalysis,
        summary: this._generateSummary(analysis, qualityAssessment),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Analyze the decision
   * @param {string|object} decision
   * @param {string} rationale
   * @returns {object}
   */
  _analyzeDecision(decision, rationale) {
    const decisionStr = typeof decision === 'string' ? decision : JSON.stringify(decision);
    const rationaleStr = rationale || '';

    return {
      decisionType: this._detectDecisionType(decisionStr),
      reversibility: this._assessReversibility(decisionStr),
      urgency: this._detectUrgency(decisionStr, rationaleStr),
      hasRationale: rationaleStr.length > 20,
      rationaleQuality: this._assessRationaleQuality(rationaleStr),
      potentialBiases: this._detectBiases(decisionStr, rationaleStr),
    };
  }

  /**
   * Detect decision type
   * @param {string} decision
   * @returns {string}
   */
  _detectDecisionType(decision) {
    const decisionLower = decision.toLowerCase();

    if (decisionLower.includes('technology') || decisionLower.includes('framework') || decisionLower.includes('tool')) {
      return 'technology_choice';
    }
    if (decisionLower.includes('architecture') || decisionLower.includes('design') || decisionLower.includes('pattern')) {
      return 'architecture';
    }
    if (decisionLower.includes('priority') || decisionLower.includes('order') || decisionLower.includes('sequence')) {
      return 'prioritization';
    }
    if (decisionLower.includes('resource') || decisionLower.includes('team') || decisionLower.includes('hire')) {
      return 'resource_allocation';
    }
    if (decisionLower.includes('deadline') || decisionLower.includes('timeline') || decisionLower.includes('schedule')) {
      return 'timeline';
    }
    if (decisionLower.includes('scope') || decisionLower.includes('feature') || decisionLower.includes('requirement')) {
      return 'scope';
    }

    return 'general';
  }

  /**
   * Assess how reversible a decision is
   * @param {string} decision
   * @returns {string}
   */
  _assessReversibility(decision) {
    const irreversibleKeywords = [
      'delete', 'remove', 'permanent', 'final', 'commit',
      'publish', 'release', 'deploy', 'migrate', 'merge',
    ];

    const decisionLower = decision.toLowerCase();
    const matchedIrreversible = irreversibleKeywords.filter(k => decisionLower.includes(k));

    if (matchedIrreversible.length >= 2) return 'irreversible';
    if (matchedIrreversible.length === 1) return 'difficult_to_reverse';
    return 'reversible';
  }

  /**
   * Detect urgency indicators
   * @param {string} decision
   * @param {string} rationale
   * @returns {string}
   */
  _detectUrgency(decision, rationale) {
    const combined = (`${decision } ${ rationale}`).toLowerCase();
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'now', 'critical', 'deadline'];

    const matchCount = urgentKeywords.filter(k => combined.includes(k)).length;

    if (matchCount >= 2) return 'high';
    if (matchCount === 1) return 'medium';
    return 'low';
  }

  /**
   * Assess quality of rationale
   * @param {string} rationale
   * @returns {string}
   */
  _assessRationaleQuality(rationale) {
    if (!rationale || rationale.length < 20) return 'missing';

    const qualityIndicators = [
      'because', 'therefore', 'since', 'given that',
      'evidence', 'data', 'research', 'experience',
      'compared to', 'trade-off', 'considered',
    ];

    const matchCount = qualityIndicators.filter(i => rationale.toLowerCase().includes(i)).length;

    if (matchCount >= 3) return 'strong';
    if (matchCount >= 1) return 'moderate';
    return 'weak';
  }

  /**
   * Detect potential cognitive biases
   * @param {string} decision
   * @param {string} rationale
   * @returns {Array}
   */
  _detectBiases(decision, rationale) {
    const biases = [];
    const combined = (`${decision } ${ rationale}`).toLowerCase();

    const biasPatterns = [
      {
        keywords: ['always', 'never', 'everyone', 'no one'],
        bias: 'Absolutism',
        description: 'Using absolute terms may indicate black-and-white thinking',
      },
      {
        keywords: ['we\'ve always', 'that\'s how', 'traditionally'],
        bias: 'Status Quo Bias',
        description: 'Preference for the current state may prevent better options',
      },
      {
        keywords: ['obvious', 'clearly', 'everyone knows'],
        bias: 'False Consensus',
        description: 'Assuming others share your views without verification',
      },
      {
        keywords: ['sunk cost', 'already invested', 'too late'],
        bias: 'Sunk Cost Fallacy',
        description: 'Past investment shouldn\'t influence future decisions',
      },
      {
        keywords: ['quick', 'easy', 'simple', 'just'],
        bias: 'Planning Fallacy',
        description: 'Underestimating time and complexity',
      },
      {
        keywords: ['i feel', 'i think', 'in my opinion'],
        bias: 'Gut Feel',
        description: 'Consider if evidence supports the intuition',
      },
    ];

    for (const { keywords, bias, description } of biasPatterns) {
      if (keywords.some(k => combined.includes(k))) {
        biases.push({ bias, description });
      }
    }

    return biases;
  }

  /**
   * Generate grill questions based on intensity
   * @param {string|object} decision
   * @param {object} analysis
   * @returns {Array}
   */
  _generateGrillQuestions(decision, analysis) {
    const questions = [];
    const questionSets = this._getQuestionSets(analysis);

    // Add basic questions (always asked)
    questions.push(...questionSets.basic);

    // Add moderate questions
    if (this.intensity !== GRILL_INTENSITY.LIGHT) {
      questions.push(...questionSets.moderate);
    }

    // Add intense questions
    if (this.intensity === GRILL_INTENSITY.INTENSE || this.intensity === GRILL_INTENSITY.EXTREME) {
      questions.push(...questionSets.intense);
    }

    // Add extreme questions
    if (this.intensity === GRILL_INTENSITY.EXTREME) {
      questions.push(...questionSets.extreme);
    }

    // Add bias-specific questions
    for (const bias of analysis.potentialBiases) {
      questions.push({
        category: 'bias',
        question: `Potential ${bias.bias} detected: ${bias.description}. How do you know this isn't affecting your judgment?`,
        purpose: 'Address cognitive bias',
      });
    }

    return questions.slice(0, this.maxQuestions);
  }

  /**
   * Get categorized question sets
   * @param {object} analysis
   * @returns {object}
   */
  _getQuestionSets(analysis) {
    return {
      basic: [
        { category: 'motivation', question: 'What problem does this decision solve?', purpose: 'Clarify the need' },
        { category: 'alternatives', question: 'What alternatives did you consider?', purpose: 'Ensure due diligence' },
        { category: 'evidence', question: 'What evidence supports this choice?', purpose: 'Validate reasoning' },
      ],
      moderate: [
        { category: 'reversibility', question: `This appears ${analysis.reversibility}. What's the rollback plan?`, purpose: 'Prepare for failure' },
        { category: 'stakeholders', question: 'Who else is affected by this decision?', purpose: 'Consider impact' },
        { category: 'timing', question: 'Why make this decision now vs. later?', purpose: 'Validate urgency' },
        { category: 'success', question: 'How will you measure if this was the right decision?', purpose: 'Define success criteria' },
      ],
      intense: [
        { category: 'contrary', question: 'What would need to be true for the opposite decision to be correct?', purpose: 'Test conviction' },
        { category: 'expert', question: 'What would an expert in this area advise?', purpose: 'Leverage expertise' },
        { category: 'future', question: 'How will you feel about this decision in 6 months?', purpose: 'Long-term thinking' },
        { category: 'regret', question: 'What would you most regret if this goes wrong?', purpose: 'Identify risks' },
      ],
      extreme: [
        { category: 'premortem', question: 'Imagine this failed spectacularly. What went wrong?', purpose: 'Premortem analysis' },
        { category: 'adversary', question: 'If someone wanted to sabotage this, how would they?', purpose: 'Find vulnerabilities' },
        { category: 'bet', question: 'Would you bet your reputation on this decision?', purpose: 'Test confidence' },
        { category: 'outsider', question: 'How would a complete outsider view this decision?', purpose: 'Fresh perspective' },
      ],
    };
  }

  /**
   * Analyze alternatives
   * @param {string|object} decision
   * @param {Array} alternatives
   * @returns {object}
   */
  _analyzeAlternatives(decision, alternatives) {
    if (alternatives.length === 0) {
      return {
        hasAlternatives: false,
        concern: 'No alternatives were considered - this may indicate premature decision-making',
        suggestion: 'Before finalizing, identify at least 2-3 alternative approaches',
      };
    }

    const analysis = {
      hasAlternatives: true,
      count: alternatives.length,
      alternatives: alternatives.map((alt, i) => ({
        alternative: typeof alt === 'string' ? alt : alt.description || JSON.stringify(alt),
        question: `Why wasn't alternative ${i + 1} chosen: "${alt}"?`,
      })),
    };

    if (alternatives.length === 1) {
      analysis.concern = 'Only one alternative considered - may miss better options';
    } else if (alternatives.length > 5) {
      analysis.concern = 'Many alternatives considered - ensure analysis paralysis isn\'t occurring';
    }

    return analysis;
  }

  /**
   * Generate counterarguments (Devil's Advocate)
   * @param {string|object} decision
   * @param {string} rationale
   * @returns {Array}
   */
  _generateCounterarguments(decision, _rationale) {
    const counterarguments = [];
    const decisionStr = typeof decision === 'string' ? decision : JSON.stringify(decision);

    // Generic counterarguments
    counterarguments.push({
      argument: 'The timing may not be right',
      explanation: 'Even good decisions fail when executed at the wrong time',
      consideration: 'What circumstances would make this the wrong time?',
    });

    counterarguments.push({
      argument: 'Hidden costs may outweigh benefits',
      explanation: 'Opportunity costs, maintenance burden, and indirect effects are often underestimated',
      consideration: 'What are the second-order effects of this decision?',
    });

    counterarguments.push({
      argument: 'The problem may resolve itself',
      explanation: 'Some issues fade without intervention, making action premature',
      consideration: 'What happens if you do nothing?',
    });

    // Decision-type specific counterarguments
    if (decisionStr.toLowerCase().includes('technology') || decisionStr.toLowerCase().includes('tool')) {
      counterarguments.push({
        argument: 'Technology decisions have long-term lock-in',
        explanation: 'Switching costs increase over time',
        consideration: 'How hard will it be to change this decision in 2 years?',
      });
    }

    if (decisionStr.toLowerCase().includes('team') || decisionStr.toLowerCase().includes('hire')) {
      counterarguments.push({
        argument: 'People decisions are the hardest to reverse',
        explanation: 'Changing team dynamics has lasting effects',
        consideration: 'Have you gotten multiple perspectives on this person/structure?',
      });
    }

    return counterarguments;
  }

  /**
   * Assess decision quality
   * @param {string|object} decision
   * @param {object} analysis
   * @param {string} rationale
   * @returns {object}
   */
  _assessDecisionQuality(decision, analysis, _rationale) {
    let score = 50; // Start neutral

    // Rationale quality impact
    const rationaleScores = { strong: 20, moderate: 10, weak: 0, missing: -20 };
    score += rationaleScores[analysis.rationaleQuality] || 0;

    // Bias penalty
    score -= analysis.potentialBiases.length * 10;

    // Reversibility bonus
    if (analysis.reversibility === 'reversible') score += 10;
    if (analysis.reversibility === 'irreversible') score -= 10;

    // Urgency check (rushed decisions may be lower quality)
    if (analysis.urgency === 'high') score -= 10;

    // Normalize
    score = Math.min(100, Math.max(0, score));

    let confidence;
    if (score >= 70) confidence = DECISION_CONFIDENCE.HIGH;
    else if (score >= 50) confidence = DECISION_CONFIDENCE.MEDIUM;
    else if (score >= 30) confidence = DECISION_CONFIDENCE.LOW;
    else confidence = DECISION_CONFIDENCE.UNCERTAIN;

    return {
      score,
      confidence,
      factors: {
        rationale: analysis.rationaleQuality,
        biasCount: analysis.potentialBiases.length,
        reversibility: analysis.reversibility,
        urgency: analysis.urgency,
      },
    };
  }

  /**
   * Generate "5 Whys" analysis
   * @param {string|object} decision
   * @param {string} rationale
   * @returns {Array}
   */
  _generateWhyAnalysis(decision, _rationale) {
    const decisionStr = typeof decision === 'string' ? decision : JSON.stringify(decision);

    return [
      {
        level: 1,
        question: `Why are you making this decision: "${decisionStr.substring(0, 50)}..."?`,
        purpose: 'Surface-level reason',
      },
      {
        level: 2,
        question: 'Why is that reason important?',
        purpose: 'Understand priorities',
      },
      {
        level: 3,
        question: 'Why does that matter to the project/team?',
        purpose: 'Connect to broader goals',
      },
      {
        level: 4,
        question: 'Why is that goal a priority now?',
        purpose: 'Validate timing',
      },
      {
        level: 5,
        question: 'Why is this the best way to achieve that?',
        purpose: 'Confirm approach',
      },
    ];
  }

  /**
   * Generate summary
   * @param {object} analysis
   * @param {object} qualityAssessment
   * @returns {string}
   */
  _generateSummary(analysis, qualityAssessment) {
    const lines = [];

    lines.push(`## Decision Grill Summary`);
    lines.push(``);
    lines.push(`**Quality Score:** ${qualityAssessment.score}/100`);
    lines.push(`**Confidence:** ${qualityAssessment.confidence}`);
    lines.push(``);
    lines.push(`### Decision Characteristics`);
    lines.push(`- **Type:** ${analysis.decisionType}`);
    lines.push(`- **Reversibility:** ${analysis.reversibility}`);
    lines.push(`- **Urgency:** ${analysis.urgency}`);
    lines.push(`- **Rationale Quality:** ${analysis.rationaleQuality}`);
    lines.push(``);

    if (analysis.potentialBiases.length > 0) {
      lines.push(`### Potential Biases Detected`);
      for (const bias of analysis.potentialBiases) {
        lines.push(`- **${bias.bias}:** ${bias.description}`);
      }
      lines.push(``);
    }

    lines.push(`### Recommendation`);
    if (qualityAssessment.confidence === DECISION_CONFIDENCE.HIGH) {
      lines.push(`Decision appears well-reasoned. Proceed with standard review.`);
    } else if (qualityAssessment.confidence === DECISION_CONFIDENCE.MEDIUM) {
      lines.push(`Decision needs strengthening. Address the grill questions before proceeding.`);
    } else {
      lines.push(`Decision quality is low. Recommend revisiting with additional analysis.`);
    }

    return lines.join('\n');
  }
}

module.exports = {
  DecisionGrillerAgent,
  DECISION_CONFIDENCE,
  GRILL_INTENSITY,
};
