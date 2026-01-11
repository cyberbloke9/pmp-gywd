/**
 * Question Templates Tests
 */

const {
  templates,
  QUESTION_TYPES,
} = require('../../lib/questioning');

describe('Question Templates', () => {
  describe('PROJECT_QUESTIONS', () => {
    test('has project type question', () => {
      const q = templates.project.find(q => q.id === 'project-type');

      expect(q).toBeDefined();
      expect(q.type).toBe(QUESTION_TYPES.CLARIFYING);
      expect(q.options).toBeDefined();
      expect(q.options.length).toBeGreaterThan(0);
    });

    test('has project scale question', () => {
      const q = templates.project.find(q => q.id === 'project-scale');

      expect(q).toBeDefined();
      expect(q.options).toBeDefined();
    });

    test('has project team question', () => {
      const q = templates.project.find(q => q.id === 'project-team');

      expect(q).toBeDefined();
    });
  });

  describe('TECHNICAL_QUESTIONS', () => {
    test('has testing approach question', () => {
      const q = templates.technical.find(q => q.id === 'testing-approach');

      expect(q).toBeDefined();
      expect(q.type).toBe(QUESTION_TYPES.TECHNICAL);
      expect(q.followUps).toBeDefined();
      expect(q.followUps.length).toBeGreaterThan(0);
    });

    test('has error handling question', () => {
      const q = templates.technical.find(q => q.id === 'error-handling');

      expect(q).toBeDefined();
      expect(q.options).toContainEqual(
        expect.objectContaining({ value: 'exceptions' }),
      );
    });

    test('has async pattern question', () => {
      const q = templates.technical.find(q => q.id === 'async-pattern');

      expect(q).toBeDefined();
      expect(q.options).toContainEqual(
        expect.objectContaining({ value: 'async-await' }),
      );
    });
  });

  describe('PREFERENCE_QUESTIONS', () => {
    test('has code style question', () => {
      const q = templates.preference.find(q => q.id === 'code-style');

      expect(q).toBeDefined();
      expect(q.type).toBe(QUESTION_TYPES.PREFERENCE);
    });

    test('has documentation level question', () => {
      const q = templates.preference.find(q => q.id === 'documentation-level');

      expect(q).toBeDefined();
    });

    test('has naming convention question', () => {
      const q = templates.preference.find(q => q.id === 'naming-convention');

      expect(q).toBeDefined();
      expect(q.options).toContainEqual(
        expect.objectContaining({ value: 'camelCase' }),
      );
    });
  });

  describe('CONSTRAINT_QUESTIONS', () => {
    test('has browser support question with condition', () => {
      const q = templates.constraint.find(q => q.id === 'browser-support');

      expect(q).toBeDefined();
      expect(q.askCondition).toBeDefined();
      expect(typeof q.askCondition).toBe('function');
    });

    test('has node version question', () => {
      const q = templates.constraint.find(q => q.id === 'node-version');

      expect(q).toBeDefined();
      expect(q.options).toContainEqual(
        expect.objectContaining({ value: '18' }),
      );
    });

    test('has dependencies question', () => {
      const q = templates.constraint.find(q => q.id === 'dependencies');

      expect(q).toBeDefined();
    });
  });

  describe('PHASE_QUESTIONS', () => {
    test('has phase priority question', () => {
      const q = templates.phase.find(q => q.id === 'phase-priority');

      expect(q).toBeDefined();
    });

    test('has phase blockers question', () => {
      const q = templates.phase.find(q => q.id === 'phase-blockers');

      expect(q).toBeDefined();
    });
  });

  describe('getAllTemplates', () => {
    test('returns all categorized templates', () => {
      const all = templates.getAll();

      expect(all.project).toBeDefined();
      expect(all.technical).toBeDefined();
      expect(all.preference).toBeDefined();
      expect(all.constraint).toBeDefined();
      expect(all.phase).toBeDefined();
    });
  });

  describe('getByTags', () => {
    test('returns questions matching tags', () => {
      const projectQuestions = templates.getByTags(['project']);

      expect(projectQuestions.length).toBeGreaterThan(0);
      expect(projectQuestions.every(q => q.tags.includes('project'))).toBe(true);
    });

    test('returns questions matching multiple tags', () => {
      const questions = templates.getByTags(['testing', 'methodology']);

      expect(questions.length).toBeGreaterThan(0);
    });

    test('returns empty for non-existent tags', () => {
      const questions = templates.getByTags(['nonexistent-tag-xyz']);

      expect(questions).toHaveLength(0);
    });
  });

  describe('getByType', () => {
    test('returns questions of specific type', () => {
      const technical = templates.getByType(QUESTION_TYPES.TECHNICAL);

      expect(technical.length).toBeGreaterThan(0);
      expect(technical.every(q => q.type === QUESTION_TYPES.TECHNICAL)).toBe(true);
    });

    test('returns empty for non-existent type', () => {
      const questions = templates.getByType('nonexistent-type');

      expect(questions).toHaveLength(0);
    });
  });

  describe('question structure validation', () => {
    test('all questions have required fields', () => {
      const all = templates.getAll();
      const allQuestions = Object.values(all).flat();

      for (const q of allQuestions) {
        expect(q.id).toBeDefined();
        expect(q.text).toBeDefined();
        expect(q.type).toBeDefined();
        expect(q.priority).toBeDefined();
        expect(q.tags).toBeDefined();
        expect(Array.isArray(q.tags)).toBe(true);
      }
    });

    test('all options have value and label', () => {
      const all = templates.getAll();
      const allQuestions = Object.values(all).flat();

      for (const q of allQuestions) {
        if (q.options) {
          for (const opt of q.options) {
            expect(opt.value).toBeDefined();
            expect(opt.label).toBeDefined();
          }
        }
      }
    });
  });
});
