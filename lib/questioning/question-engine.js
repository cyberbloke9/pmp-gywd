/**
 * Adaptive Questioning Engine
 *
 * Generates context-aware questions that learn from responses.
 * Core component of the "sophisticated brain" for v3.0.
 */

/**
 * Question types for different purposes
 */
const QUESTION_TYPES = {
  CLARIFYING: 'clarifying', // Clarify ambiguous requirements
  EXPLORATORY: 'exploratory', // Discover unknown aspects
  VALIDATING: 'validating', // Confirm assumptions
  TECHNICAL: 'technical', // Technical decisions
  PREFERENCE: 'preference', // User preferences
  CONSTRAINT: 'constraint', // Identify constraints
};

/**
 * Question priority levels
 */
const PRIORITY = {
  CRITICAL: 'critical', // Must ask before proceeding
  HIGH: 'high', // Important but can infer
  MEDIUM: 'medium', // Good to know
  LOW: 'low', // Nice to have
};

/**
 * Question template structure
 */
const createQuestion = (opts) => ({
  // Spread opts first to include any extra fields (expertText, beginnerText, etc.)
  ...opts,
  // Then set defaults for standard fields
  id: opts.id || `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type: opts.type || QUESTION_TYPES.CLARIFYING,
  priority: opts.priority || PRIORITY.MEDIUM,
  text: opts.text,
  context: opts.context || null,
  options: opts.options || null,
  defaultAnswer: opts.defaultAnswer || null,
  followUps: opts.followUps || [],
  tags: opts.tags || [],
  askCondition: opts.askCondition || null,
  skipIfKnown: opts.skipIfKnown || [],
});

/**
 * Adaptive Questioning Engine class
 */
class QuestionEngine {
  constructor() {
    this.questionHistory = [];
    this.knowledgeBase = new Map();
    this.askedQuestions = new Set();
    this.userProfile = null;
  }

  /**
   * Set user profile for personalized questions
   * @param {object} profile - User profile from ProfileManager
   */
  setProfile(profile) {
    this.userProfile = profile;
  }

  /**
   * Record an answer to a question
   * @param {string} questionId - Question ID
   * @param {any} answer - The answer provided
   * @param {object} metadata - Additional metadata
   */
  recordAnswer(questionId, answer, metadata = {}) {
    this.questionHistory.push({
      questionId,
      answer,
      timestamp: Date.now(),
      ...metadata,
    });

    // Update knowledge base
    if (metadata.knowledgeKey) {
      this.knowledgeBase.set(metadata.knowledgeKey, {
        value: answer,
        source: 'direct-answer',
        confidence: 1.0,
        timestamp: Date.now(),
      });
    }

    this.askedQuestions.add(questionId);
  }

  /**
   * Record inferred knowledge
   * @param {string} key - Knowledge key
   * @param {any} value - Inferred value
   * @param {number} confidence - Confidence level (0-1)
   */
  recordInference(key, value, confidence = 0.7) {
    this.knowledgeBase.set(key, {
      value,
      source: 'inference',
      confidence,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if we already know something
   * @param {string} key - Knowledge key
   * @param {number} minConfidence - Minimum confidence required
   * @returns {boolean}
   */
  isKnown(key, minConfidence = 0.7) {
    const knowledge = this.knowledgeBase.get(key);
    if (!knowledge) return false;
    return knowledge.confidence >= minConfidence;
  }

  /**
   * Get known value
   * @param {string} key - Knowledge key
   * @returns {any} The known value or undefined
   */
  getKnowledge(key) {
    const knowledge = this.knowledgeBase.get(key);
    return knowledge ? knowledge.value : undefined;
  }

  /**
   * Check if a question should be asked
   * @param {object} question - Question object
   * @returns {boolean}
   */
  shouldAsk(question) {
    // Already asked this specific question
    if (this.askedQuestions.has(question.id)) {
      return false;
    }

    // Check skipIfKnown conditions
    if (question.skipIfKnown && question.skipIfKnown.length > 0) {
      const allKnown = question.skipIfKnown.every(key => this.isKnown(key));
      if (allKnown) {
        return false;
      }
    }

    // Check custom ask condition
    if (question.askCondition && typeof question.askCondition === 'function') {
      return question.askCondition(this.knowledgeBase, this.userProfile);
    }

    return true;
  }

  /**
   * Filter questions to only those that should be asked
   * @param {Array} questions - Array of questions
   * @returns {Array} Filtered questions
   */
  filterQuestions(questions) {
    return questions.filter(q => this.shouldAsk(q));
  }

  /**
   * Sort questions by priority
   * @param {Array} questions - Array of questions
   * @returns {Array} Sorted questions
   */
  sortByPriority(questions) {
    const priorityOrder = {
      [PRIORITY.CRITICAL]: 0,
      [PRIORITY.HIGH]: 1,
      [PRIORITY.MEDIUM]: 2,
      [PRIORITY.LOW]: 3,
    };

    return [...questions].sort((a, b) => {
      // Use ?? instead of || because 0 is a valid priority value
      const aOrder = priorityOrder[a.priority] ?? 2;
      const bOrder = priorityOrder[b.priority] ?? 2;
      return aOrder - bOrder;
    });
  }

  /**
   * Get next questions to ask
   * @param {Array} questions - Available questions
   * @param {number} maxCount - Maximum number to return
   * @returns {Array} Questions to ask
   */
  getNextQuestions(questions, maxCount = 3) {
    const filtered = this.filterQuestions(questions);
    const sorted = this.sortByPriority(filtered);
    return sorted.slice(0, maxCount);
  }

  /**
   * Adapt question depth based on user expertise
   * @param {object} question - Question object
   * @param {string} domain - Domain area
   * @returns {object} Adapted question
   */
  adaptToExpertise(question, domain) {
    if (!this.userProfile) return question;

    const expertise = this.userProfile.domain?.expertiseAreas || [];
    const isExpert = expertise.includes(domain);

    if (isExpert) {
      // Experts get more technical, less explanation
      return {
        ...question,
        text: question.expertText || question.text,
        options: question.expertOptions || question.options,
      };
    }

    // Non-experts get more context
    return {
      ...question,
      text: question.beginnerText || question.text,
      context: question.beginnerContext || question.context,
    };
  }

  /**
   * Generate follow-up questions based on answer
   * @param {object} question - Original question
   * @param {any} answer - The answer provided
   * @returns {Array} Follow-up questions
   */
  generateFollowUps(question, answer) {
    if (!question.followUps || question.followUps.length === 0) {
      return [];
    }

    return question.followUps
      .filter(fu => {
        if (fu.condition && typeof fu.condition === 'function') {
          return fu.condition(answer);
        }
        if (fu.triggerAnswer !== undefined) {
          return fu.triggerAnswer === answer;
        }
        return true;
      })
      .map(fu => createQuestion(fu));
  }

  /**
   * Get question history summary
   * @returns {object} Summary of asked questions
   */
  getHistorySummary() {
    const byType = {};
    const byPriority = {};

    for (const entry of this.questionHistory) {
      const q = entry;
      byType[q.type] = (byType[q.type] || 0) + 1;
      byPriority[q.priority] = (byPriority[q.priority] || 0) + 1;
    }

    return {
      totalAsked: this.questionHistory.length,
      byType,
      byPriority,
      knowledgeCount: this.knowledgeBase.size,
    };
  }

  /**
   * Clear all state (for testing)
   */
  clear() {
    this.questionHistory = [];
    this.knowledgeBase.clear();
    this.askedQuestions.clear();
    this.userProfile = null;
  }

  /**
   * Export current knowledge base
   * @returns {object} Knowledge base as plain object
   */
  exportKnowledge() {
    return Object.fromEntries(this.knowledgeBase);
  }

  /**
   * Import knowledge base
   * @param {object} knowledge - Knowledge to import
   */
  importKnowledge(knowledge) {
    for (const [key, value] of Object.entries(knowledge)) {
      this.knowledgeBase.set(key, value);
    }
  }
}

module.exports = {
  QuestionEngine,
  QUESTION_TYPES,
  PRIORITY,
  createQuestion,
};
