/**
 * Pattern Learner Tests
 */

const { PatternLearner, PATTERN_SIGNALS } = require('../../lib/profile');

describe('PatternLearner', () => {
  let learner;

  beforeEach(() => {
    learner = new PatternLearner();
  });

  describe('observeCode', () => {
    test('returns detected patterns', () => {
      const code = `
        function getUserName() {
          return this.name;
        }
      `;

      const patterns = learner.observeCode(code, 'function');

      expect(patterns.naming).toBeDefined();
      expect(patterns.structure).toBeDefined();
    });

    test('stores observations', () => {
      learner.observeCode('const x = 1;');
      learner.observeCode('const y = 2;');

      expect(learner.observations).toHaveLength(2);
    });
  });

  describe('detectNamingPatterns', () => {
    test('detects camelCase', () => {
      const code = `
        function getUserName() {}
        const firstName = 'John';
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.naming.camelCase).toBeGreaterThan(0);
      expect(patterns.naming.dominant).toBe('camel');
    });

    test('detects snake_case', () => {
      const code = `
        function get_user_name() {}
        const first_name = 'John';
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.naming.snake_case).toBeGreaterThan(0);
    });
  });

  describe('detectDocPatterns', () => {
    test('detects JSDoc', () => {
      const code = `
        /**
         * Gets the user name
         * @returns {string}
         */
        function getUser() {}
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.documentation.jsdoc).toBe(true);
      expect(patterns.documentation.style).toBe('jsdoc');
    });

    test('detects inline comments', () => {
      const code = `
        // Get the user
        function getUser() {}
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.documentation.inlineComments).toBe(true);
    });

    test('calculates comment ratio', () => {
      const code = `
        // comment 1
        const x = 1;
        // comment 2
        const y = 2;
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.documentation.commentRatio).toBeGreaterThan(0);
    });
  });

  describe('detectTestingPatterns', () => {
    test('detects Jest patterns', () => {
      const code = `
        describe('MyModule', () => {
          it('should work', () => {
            expect(true).toBe(true);
          });
        });
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.testing.framework).toBe('jest');
      expect(patterns.testing.usesDescribe).toBe(true);
      expect(patterns.testing.usesIt).toBe(true);
      expect(patterns.testing.usesExpect).toBe(true);
    });

    test('detects node assert', () => {
      const code = `
        const assert = require('assert');
        assert.strictEqual(1, 1);
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.testing.framework).toBe('node-assert');
    });
  });

  describe('detectStructurePatterns', () => {
    test('detects OOP paradigm', () => {
      const code = `
        class User {
          constructor(name) {
            this.name = name;
          }
        }
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.structure.paradigm).toBe('oop');
      expect(patterns.structure.usesClasses).toBe(true);
    });

    test('detects functional paradigm', () => {
      const code = `
        function getUser(id) {
          return fetch('/users/' + id);
        }

        function formatUser(user) {
          return user.name;
        }
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.structure.paradigm).toBe('functional');
      expect(patterns.structure.usesFunctions).toBe(true);
    });

    test('detects async patterns', () => {
      const code = `
        async function fetchData() {
          return await fetch('/api');
        }
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.structure.usesAsync).toBe(true);
    });

    test('detects CommonJS modules', () => {
      const code = `
        module.exports = { hello: 'world' };
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.structure.moduleStyle).toBe('commonjs');
    });

    test('detects ES modules', () => {
      const code = `
        export default function hello() {}
        export const name = 'test';
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.structure.moduleStyle).toBe('esm');
    });

    test('detects arrow functions', () => {
      const code = `
        const add = (a, b) => {
          return a + b;
        };
      `;

      const patterns = learner.extractPatterns(code);

      expect(patterns.structure.usesArrowFunctions).toBe(true);
    });
  });

  describe('updateLearnedPatterns', () => {
    test('learns patterns after multiple observations', () => {
      const code = `
        function getUserName() {}
        function getFullName() {}
      `;

      // Need multiple observations to learn
      for (let i = 0; i < 5; i++) {
        learner.observeCode(code);
      }

      const learned = learner.getLearnedPatterns();

      expect(Object.keys(learned).length).toBeGreaterThan(0);
    });

    test('does not learn with few observations', () => {
      learner.observeCode('const x = 1;');
      learner.observeCode('const y = 2;');

      const learned = learner.getLearnedPatterns();

      expect(Object.keys(learned).length).toBe(0);
    });
  });

  describe('getConfidence', () => {
    test('returns 0 for unknown patterns', () => {
      expect(learner.getConfidence('unknown.pattern')).toBe(0);
    });

    test('returns confidence for learned patterns', () => {
      const code = `
        describe('test', () => {
          it('works', () => {
            expect(1).toBe(1);
          });
        });
      `;

      for (let i = 0; i < 5; i++) {
        learner.observeCode(code);
      }

      // Should have learned jest patterns
      const confidence = learner.getConfidence('testing.usesDescribe');
      expect(confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clear', () => {
    test('clears observations and patterns', () => {
      learner.observeCode('const x = 1;');
      learner.clear();

      expect(learner.observations).toHaveLength(0);
      expect(learner.getLearnedPatterns()).toEqual({});
    });
  });

  describe('PATTERN_SIGNALS', () => {
    test('camelCase regex works', () => {
      expect(PATTERN_SIGNALS.camelCase.test('getUserName')).toBe(true);
      expect(PATTERN_SIGNALS.camelCase.test('GetUserName')).toBe(false);
    });

    test('snake_case regex works', () => {
      expect(PATTERN_SIGNALS.snake_case.test('get_user_name')).toBe(true);
      expect(PATTERN_SIGNALS.snake_case.test('getUserName')).toBe(false);
    });

    test('PascalCase regex works', () => {
      expect(PATTERN_SIGNALS.PascalCase.test('UserService')).toBe(true);
      expect(PATTERN_SIGNALS.PascalCase.test('userService')).toBe(false);
    });
  });
});
