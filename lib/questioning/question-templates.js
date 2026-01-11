/**
 * Question Templates
 *
 * Predefined question templates for common development scenarios.
 * Used by the Adaptive Questioning Engine.
 */

const { QUESTION_TYPES, PRIORITY, createQuestion } = require('./question-engine');

/**
 * Project initialization questions
 */
const PROJECT_QUESTIONS = [
  createQuestion({
    id: 'project-type',
    type: QUESTION_TYPES.CLARIFYING,
    priority: PRIORITY.CRITICAL,
    text: 'What type of project is this?',
    options: [
      { value: 'web-app', label: 'Web Application' },
      { value: 'api', label: 'API/Backend Service' },
      { value: 'cli', label: 'Command Line Tool' },
      { value: 'library', label: 'Library/Package' },
      { value: 'mobile', label: 'Mobile Application' },
      { value: 'other', label: 'Other' },
    ],
    tags: ['project', 'initialization'],
    skipIfKnown: ['project.type'],
  }),

  createQuestion({
    id: 'project-scale',
    type: QUESTION_TYPES.EXPLORATORY,
    priority: PRIORITY.HIGH,
    text: 'What is the expected scale of this project?',
    options: [
      { value: 'prototype', label: 'Prototype/POC' },
      { value: 'small', label: 'Small (1-5 files)' },
      { value: 'medium', label: 'Medium (5-20 files)' },
      { value: 'large', label: 'Large (20+ files)' },
      { value: 'enterprise', label: 'Enterprise scale' },
    ],
    tags: ['project', 'scope'],
    skipIfKnown: ['project.scale'],
  }),

  createQuestion({
    id: 'project-team',
    type: QUESTION_TYPES.EXPLORATORY,
    priority: PRIORITY.MEDIUM,
    text: 'Who will be working on this project?',
    options: [
      { value: 'solo', label: 'Just me' },
      { value: 'small-team', label: 'Small team (2-5)' },
      { value: 'large-team', label: 'Large team (5+)' },
      { value: 'open-source', label: 'Open source community' },
    ],
    tags: ['project', 'team'],
    skipIfKnown: ['project.team'],
  }),
];

/**
 * Technical decision questions
 */
const TECHNICAL_QUESTIONS = [
  createQuestion({
    id: 'testing-approach',
    type: QUESTION_TYPES.TECHNICAL,
    priority: PRIORITY.HIGH,
    text: 'What testing approach do you prefer?',
    options: [
      { value: 'tdd', label: 'Test-Driven Development' },
      { value: 'bdd', label: 'Behavior-Driven Development' },
      { value: 'post-hoc', label: 'Write tests after implementation' },
      { value: 'minimal', label: 'Minimal testing' },
    ],
    tags: ['testing', 'methodology'],
    skipIfKnown: ['testing.approach'],
    followUps: [
      {
        id: 'testing-coverage',
        type: QUESTION_TYPES.PREFERENCE,
        priority: PRIORITY.MEDIUM,
        text: 'What level of test coverage do you target?',
        options: [
          { value: 'critical', label: 'Critical paths only (50-60%)' },
          { value: 'standard', label: 'Standard coverage (70-80%)' },
          { value: 'comprehensive', label: 'Comprehensive (80%+)' },
        ],
        triggerAnswer: value => value !== 'minimal',
      },
    ],
  }),

  createQuestion({
    id: 'error-handling',
    type: QUESTION_TYPES.TECHNICAL,
    priority: PRIORITY.MEDIUM,
    text: 'How should errors be handled?',
    options: [
      { value: 'exceptions', label: 'Throw exceptions' },
      { value: 'result-types', label: 'Return Result/Either types' },
      { value: 'error-codes', label: 'Return error codes' },
      { value: 'mixed', label: 'Mixed approach' },
    ],
    tags: ['error-handling', 'patterns'],
    skipIfKnown: ['error.handling'],
  }),

  createQuestion({
    id: 'async-pattern',
    type: QUESTION_TYPES.TECHNICAL,
    priority: PRIORITY.MEDIUM,
    text: 'Preferred async pattern?',
    options: [
      { value: 'async-await', label: 'async/await' },
      { value: 'promises', label: 'Promises (.then/.catch)' },
      { value: 'callbacks', label: 'Callbacks' },
      { value: 'observables', label: 'Observables/RxJS' },
    ],
    tags: ['async', 'patterns'],
    skipIfKnown: ['async.pattern'],
  }),
];

/**
 * Preference questions
 */
const PREFERENCE_QUESTIONS = [
  createQuestion({
    id: 'code-style',
    type: QUESTION_TYPES.PREFERENCE,
    priority: PRIORITY.MEDIUM,
    text: 'What code style do you prefer?',
    options: [
      { value: 'compact', label: 'Compact (fewer lines)' },
      { value: 'verbose', label: 'Verbose (explicit and clear)' },
      { value: 'balanced', label: 'Balanced' },
    ],
    tags: ['style', 'preferences'],
    skipIfKnown: ['style.code'],
  }),

  createQuestion({
    id: 'documentation-level',
    type: QUESTION_TYPES.PREFERENCE,
    priority: PRIORITY.LOW,
    text: 'How much documentation do you want?',
    options: [
      { value: 'minimal', label: 'Minimal (only complex parts)' },
      { value: 'standard', label: 'Standard (public APIs)' },
      { value: 'comprehensive', label: 'Comprehensive (everything)' },
    ],
    tags: ['documentation', 'preferences'],
    skipIfKnown: ['documentation.level'],
  }),

  createQuestion({
    id: 'naming-convention',
    type: QUESTION_TYPES.PREFERENCE,
    priority: PRIORITY.LOW,
    text: 'Preferred naming convention for functions?',
    options: [
      { value: 'camelCase', label: 'camelCase' },
      { value: 'snake_case', label: 'snake_case' },
      { value: 'PascalCase', label: 'PascalCase' },
    ],
    tags: ['naming', 'preferences'],
    skipIfKnown: ['naming.functions'],
  }),
];

/**
 * Constraint questions
 */
const CONSTRAINT_QUESTIONS = [
  createQuestion({
    id: 'browser-support',
    type: QUESTION_TYPES.CONSTRAINT,
    priority: PRIORITY.HIGH,
    text: 'What browsers need to be supported?',
    options: [
      { value: 'modern', label: 'Modern browsers only' },
      { value: 'ie11', label: 'Including IE11' },
      { value: 'mobile', label: 'Mobile browsers focus' },
      { value: 'all', label: 'All browsers' },
    ],
    tags: ['constraints', 'browser'],
    skipIfKnown: ['constraints.browsers'],
    askCondition: (kb) => kb.get('project.type')?.value === 'web-app',
  }),

  createQuestion({
    id: 'node-version',
    type: QUESTION_TYPES.CONSTRAINT,
    priority: PRIORITY.MEDIUM,
    text: 'Minimum Node.js version to support?',
    options: [
      { value: '16', label: 'Node 16 LTS' },
      { value: '18', label: 'Node 18 LTS' },
      { value: '20', label: 'Node 20 LTS' },
      { value: '22', label: 'Node 22 (Current)' },
    ],
    tags: ['constraints', 'node'],
    skipIfKnown: ['constraints.node'],
  }),

  createQuestion({
    id: 'dependencies',
    type: QUESTION_TYPES.CONSTRAINT,
    priority: PRIORITY.MEDIUM,
    text: 'What is your dependency philosophy?',
    options: [
      { value: 'minimal', label: 'Minimize dependencies' },
      { value: 'pragmatic', label: 'Use well-maintained packages' },
      { value: 'full', label: 'Use packages freely' },
    ],
    tags: ['constraints', 'dependencies'],
    skipIfKnown: ['constraints.dependencies'],
  }),
];

/**
 * Phase-specific questions
 */
const PHASE_QUESTIONS = [
  createQuestion({
    id: 'phase-priority',
    type: QUESTION_TYPES.CLARIFYING,
    priority: PRIORITY.HIGH,
    text: 'What is the priority for this phase?',
    options: [
      { value: 'speed', label: 'Speed (ship fast)' },
      { value: 'quality', label: 'Quality (thorough testing)' },
      { value: 'balanced', label: 'Balanced' },
    ],
    tags: ['phase', 'priority'],
  }),

  createQuestion({
    id: 'phase-blockers',
    type: QUESTION_TYPES.EXPLORATORY,
    priority: PRIORITY.HIGH,
    text: 'Are there any known blockers or concerns for this phase?',
    options: [
      { value: 'none', label: 'No known blockers' },
      { value: 'technical', label: 'Technical uncertainty' },
      { value: 'dependencies', label: 'Waiting on dependencies' },
      { value: 'requirements', label: 'Requirements unclear' },
    ],
    tags: ['phase', 'blockers'],
  }),
];

/**
 * Get all question templates
 * @returns {object} Categorized question templates
 */
function getAllTemplates() {
  return {
    project: PROJECT_QUESTIONS,
    technical: TECHNICAL_QUESTIONS,
    preference: PREFERENCE_QUESTIONS,
    constraint: CONSTRAINT_QUESTIONS,
    phase: PHASE_QUESTIONS,
  };
}

/**
 * Get questions by tags
 * @param {string[]} tags - Tags to filter by
 * @returns {Array} Matching questions
 */
function getByTags(tags) {
  const allQuestions = [
    ...PROJECT_QUESTIONS,
    ...TECHNICAL_QUESTIONS,
    ...PREFERENCE_QUESTIONS,
    ...CONSTRAINT_QUESTIONS,
    ...PHASE_QUESTIONS,
  ];

  return allQuestions.filter(q =>
    q.tags.some(t => tags.includes(t)),
  );
}

/**
 * Get questions by type
 * @param {string} type - Question type
 * @returns {Array} Matching questions
 */
function getByType(type) {
  const allQuestions = [
    ...PROJECT_QUESTIONS,
    ...TECHNICAL_QUESTIONS,
    ...PREFERENCE_QUESTIONS,
    ...CONSTRAINT_QUESTIONS,
    ...PHASE_QUESTIONS,
  ];

  return allQuestions.filter(q => q.type === type);
}

module.exports = {
  PROJECT_QUESTIONS,
  TECHNICAL_QUESTIONS,
  PREFERENCE_QUESTIONS,
  CONSTRAINT_QUESTIONS,
  PHASE_QUESTIONS,
  getAllTemplates,
  getByTags,
  getByType,
};
