/**
 * Questioning Module
 *
 * Adaptive questioning engine for intelligent context gathering.
 * Central export for all questioning-related functionality.
 */

const {
  QuestionEngine,
  QUESTION_TYPES,
  PRIORITY,
  createQuestion,
} = require('./question-engine');

const {
  PROJECT_QUESTIONS,
  TECHNICAL_QUESTIONS,
  PREFERENCE_QUESTIONS,
  CONSTRAINT_QUESTIONS,
  PHASE_QUESTIONS,
  getAllTemplates,
  getByTags,
  getByType,
} = require('./question-templates');

module.exports = {
  // Classes
  QuestionEngine,

  // Constants
  QUESTION_TYPES,
  PRIORITY,

  // Factory functions
  createQuestion,
  createQuestionEngine: () => new QuestionEngine(),

  // Templates
  templates: {
    project: PROJECT_QUESTIONS,
    technical: TECHNICAL_QUESTIONS,
    preference: PREFERENCE_QUESTIONS,
    constraint: CONSTRAINT_QUESTIONS,
    phase: PHASE_QUESTIONS,
    getAll: getAllTemplates,
    getByTags,
    getByType,
  },
};
