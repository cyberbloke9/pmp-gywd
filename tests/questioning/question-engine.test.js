/**
 * Question Engine Tests
 */

const {
  QuestionEngine,
  QUESTION_TYPES,
  PRIORITY,
  createQuestion,
} = require('../../lib/questioning');

describe('QuestionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new QuestionEngine();
  });

  describe('createQuestion', () => {
    test('creates question with defaults', () => {
      const q = createQuestion({
        text: 'What is your name?',
      });

      expect(q.id).toMatch(/^q-/);
      expect(q.text).toBe('What is your name?');
      expect(q.type).toBe(QUESTION_TYPES.CLARIFYING);
      expect(q.priority).toBe(PRIORITY.MEDIUM);
    });

    test('creates question with custom values', () => {
      const q = createQuestion({
        id: 'custom-id',
        type: QUESTION_TYPES.TECHNICAL,
        priority: PRIORITY.CRITICAL,
        text: 'How should errors be handled?',
        options: [{ value: 'throw', label: 'Throw' }],
      });

      expect(q.id).toBe('custom-id');
      expect(q.type).toBe(QUESTION_TYPES.TECHNICAL);
      expect(q.priority).toBe(PRIORITY.CRITICAL);
      expect(q.options).toHaveLength(1);
    });
  });

  describe('recordAnswer', () => {
    test('records answer in history', () => {
      engine.recordAnswer('q1', 'yes');

      expect(engine.questionHistory).toHaveLength(1);
      expect(engine.questionHistory[0].answer).toBe('yes');
    });

    test('updates knowledge base with key', () => {
      engine.recordAnswer('q1', 'TypeScript', {
        knowledgeKey: 'language.primary',
      });

      expect(engine.isKnown('language.primary')).toBe(true);
      expect(engine.getKnowledge('language.primary')).toBe('TypeScript');
    });

    test('marks question as asked', () => {
      engine.recordAnswer('q1', 'answer');

      expect(engine.askedQuestions.has('q1')).toBe(true);
    });
  });

  describe('recordInference', () => {
    test('records inferred knowledge', () => {
      engine.recordInference('language.testing', 'Jest', 0.8);

      expect(engine.isKnown('language.testing')).toBe(true);
      expect(engine.getKnowledge('language.testing')).toBe('Jest');
    });

    test('uses default confidence', () => {
      engine.recordInference('style.tabs', 2);

      expect(engine.isKnown('style.tabs', 0.7)).toBe(true);
      expect(engine.isKnown('style.tabs', 0.8)).toBe(false);
    });
  });

  describe('isKnown', () => {
    test('returns false for unknown keys', () => {
      expect(engine.isKnown('unknown.key')).toBe(false);
    });

    test('respects confidence threshold', () => {
      engine.recordInference('key', 'value', 0.5);

      expect(engine.isKnown('key', 0.3)).toBe(true);
      expect(engine.isKnown('key', 0.7)).toBe(false);
    });
  });

  describe('shouldAsk', () => {
    test('returns true for new question', () => {
      const q = createQuestion({ id: 'new-q', text: 'Test?' });

      expect(engine.shouldAsk(q)).toBe(true);
    });

    test('returns false for already asked question', () => {
      const q = createQuestion({ id: 'asked-q', text: 'Test?' });
      engine.recordAnswer('asked-q', 'answer');

      expect(engine.shouldAsk(q)).toBe(false);
    });

    test('returns false if skipIfKnown conditions met', () => {
      engine.recordAnswer('q1', 'value', { knowledgeKey: 'known.key' });

      const q = createQuestion({
        id: 'skip-q',
        text: 'Test?',
        skipIfKnown: ['known.key'],
      });

      expect(engine.shouldAsk(q)).toBe(false);
    });

    test('returns true if not all skipIfKnown met', () => {
      engine.recordAnswer('q1', 'value', { knowledgeKey: 'known.key' });

      const q = createQuestion({
        id: 'skip-q',
        text: 'Test?',
        skipIfKnown: ['known.key', 'unknown.key'],
      });

      expect(engine.shouldAsk(q)).toBe(true);
    });

    test('respects askCondition function', () => {
      const q = createQuestion({
        id: 'conditional-q',
        text: 'Test?',
        askCondition: () => false,
      });

      expect(engine.shouldAsk(q)).toBe(false);
    });
  });

  describe('filterQuestions', () => {
    test('filters out asked questions', () => {
      const questions = [
        createQuestion({ id: 'q1', text: 'Q1?' }),
        createQuestion({ id: 'q2', text: 'Q2?' }),
        createQuestion({ id: 'q3', text: 'Q3?' }),
      ];

      engine.recordAnswer('q2', 'answer');

      const filtered = engine.filterQuestions(questions);

      expect(filtered).toHaveLength(2);
      expect(filtered.find(q => q.id === 'q2')).toBeUndefined();
    });
  });

  describe('sortByPriority', () => {
    test('sorts questions by priority', () => {
      const questions = [
        createQuestion({ id: 'low', text: 'Low?', priority: PRIORITY.LOW }),
        createQuestion({ id: 'critical', text: 'Critical?', priority: PRIORITY.CRITICAL }),
        createQuestion({ id: 'high', text: 'High?', priority: PRIORITY.HIGH }),
      ];

      const sorted = engine.sortByPriority(questions);

      expect(sorted[0].id).toBe('critical');
      expect(sorted[1].id).toBe('high');
      expect(sorted[2].id).toBe('low');
    });
  });

  describe('getNextQuestions', () => {
    test('returns filtered and sorted questions', () => {
      const questions = [
        createQuestion({ id: 'low', text: 'Low?', priority: PRIORITY.LOW }),
        createQuestion({ id: 'critical', text: 'Critical?', priority: PRIORITY.CRITICAL }),
        createQuestion({ id: 'high', text: 'High?', priority: PRIORITY.HIGH }),
        createQuestion({ id: 'medium', text: 'Medium?', priority: PRIORITY.MEDIUM }),
      ];

      engine.recordAnswer('high', 'answer');

      const next = engine.getNextQuestions(questions, 2);

      expect(next).toHaveLength(2);
      expect(next[0].id).toBe('critical');
      expect(next[1].id).toBe('medium');
    });
  });

  describe('adaptToExpertise', () => {
    test('returns expert version for experts', () => {
      engine.setProfile({
        domain: { expertiseAreas: ['testing'] },
      });

      const q = createQuestion({
        text: 'What testing framework?',
        expertText: 'Jest, Mocha, or Vitest?',
      });

      const adapted = engine.adaptToExpertise(q, 'testing');

      expect(adapted.text).toBe('Jest, Mocha, or Vitest?');
    });

    test('returns beginner version for non-experts', () => {
      engine.setProfile({
        domain: { expertiseAreas: [] },
      });

      const q = createQuestion({
        text: 'What testing framework?',
        beginnerText: 'How should we test the code?',
        beginnerContext: 'Testing helps catch bugs early.',
      });

      const adapted = engine.adaptToExpertise(q, 'testing');

      expect(adapted.text).toBe('How should we test the code?');
      expect(adapted.context).toBe('Testing helps catch bugs early.');
    });

    test('returns original if no profile', () => {
      const q = createQuestion({ text: 'Original?' });
      const adapted = engine.adaptToExpertise(q, 'testing');

      expect(adapted.text).toBe('Original?');
    });
  });

  describe('generateFollowUps', () => {
    test('generates follow-ups based on answer', () => {
      const q = createQuestion({
        text: 'Use testing?',
        followUps: [
          {
            id: 'fu1',
            text: 'Which framework?',
            triggerAnswer: 'yes',
          },
        ],
      });

      const followUps = engine.generateFollowUps(q, 'yes');

      expect(followUps).toHaveLength(1);
      expect(followUps[0].text).toBe('Which framework?');
    });

    test('filters out non-matching follow-ups', () => {
      const q = createQuestion({
        text: 'Use testing?',
        followUps: [
          {
            id: 'fu1',
            text: 'Which framework?',
            triggerAnswer: 'yes',
          },
        ],
      });

      const followUps = engine.generateFollowUps(q, 'no');

      expect(followUps).toHaveLength(0);
    });

    test('returns empty for questions without follow-ups', () => {
      const q = createQuestion({ text: 'Simple question?' });
      const followUps = engine.generateFollowUps(q, 'answer');

      expect(followUps).toHaveLength(0);
    });
  });

  describe('getHistorySummary', () => {
    test('returns summary of question history', () => {
      engine.recordAnswer('q1', 'a');
      engine.recordAnswer('q2', 'b');
      engine.recordInference('key', 'value');

      const summary = engine.getHistorySummary();

      expect(summary.totalAsked).toBe(2);
      expect(summary.knowledgeCount).toBe(1);
    });
  });

  describe('exportKnowledge/importKnowledge', () => {
    test('exports and imports knowledge', () => {
      engine.recordInference('key1', 'value1');
      engine.recordInference('key2', 'value2');

      const exported = engine.exportKnowledge();
      engine.clear();

      expect(engine.isKnown('key1')).toBe(false);

      engine.importKnowledge(exported);

      expect(engine.isKnown('key1')).toBe(true);
      expect(engine.getKnowledge('key2')).toBe('value2');
    });
  });

  describe('clear', () => {
    test('clears all state', () => {
      engine.recordAnswer('q1', 'a');
      engine.recordInference('key', 'value');
      engine.setProfile({ name: 'test' });

      engine.clear();

      expect(engine.questionHistory).toHaveLength(0);
      expect(engine.isKnown('key')).toBe(false);
      expect(engine.userProfile).toBeNull();
    });
  });
});

describe('QUESTION_TYPES', () => {
  test('has expected types', () => {
    expect(QUESTION_TYPES.CLARIFYING).toBe('clarifying');
    expect(QUESTION_TYPES.EXPLORATORY).toBe('exploratory');
    expect(QUESTION_TYPES.TECHNICAL).toBe('technical');
  });
});

describe('PRIORITY', () => {
  test('has expected priorities', () => {
    expect(PRIORITY.CRITICAL).toBe('critical');
    expect(PRIORITY.HIGH).toBe('high');
    expect(PRIORITY.MEDIUM).toBe('medium');
    expect(PRIORITY.LOW).toBe('low');
  });
});
