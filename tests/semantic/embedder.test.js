'use strict';

const { Embedder, cosineSimilarity, tokenize, termFrequency, STOP_WORDS } = require('../../lib/semantic/embedder');

describe('tokenize', () => {
  test('lowercases and splits text', () => {
    const tokens = tokenize('Hello World Test');
    expect(tokens).toEqual(['hello', 'world', 'test']);
  });

  test('removes stop words', () => {
    const tokens = tokenize('the cat is on the mat');
    expect(tokens).toEqual(['cat', 'mat']);
  });

  test('removes short words (<=2 chars)', () => {
    const tokens = tokenize('go to do it now fix');
    expect(tokens).toEqual(['now', 'fix']);
  });

  test('strips punctuation', () => {
    const tokens = tokenize('hello, world! testing... 123');
    expect(tokens).toEqual(['hello', 'world', 'testing', '123']);
  });

  test('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  test('handles text with only stop words', () => {
    expect(tokenize('the is a an')).toEqual([]);
  });
});

describe('termFrequency', () => {
  test('computes normalized frequencies', () => {
    const tf = termFrequency(['hello', 'world', 'hello']);
    expect(tf.get('hello')).toBeCloseTo(2 / 3);
    expect(tf.get('world')).toBeCloseTo(1 / 3);
  });

  test('handles single token', () => {
    const tf = termFrequency(['hello']);
    expect(tf.get('hello')).toBe(1);
  });

  test('handles empty array', () => {
    const tf = termFrequency([]);
    expect(tf.size).toBe(0);
  });
});

describe('STOP_WORDS', () => {
  test('is a Set', () => {
    expect(STOP_WORDS).toBeInstanceOf(Set);
  });

  test('contains common stop words', () => {
    expect(STOP_WORDS.has('the')).toBe(true);
    expect(STOP_WORDS.has('is')).toBe(true);
    expect(STOP_WORDS.has('and')).toBe(true);
  });

  test('does not contain content words', () => {
    expect(STOP_WORDS.has('javascript')).toBe(false);
    expect(STOP_WORDS.has('code')).toBe(false);
  });
});

describe('Embedder', () => {
  let embedder;

  beforeEach(() => {
    embedder = new Embedder();
  });

  test('starts unfitted', () => {
    expect(embedder.isFitted()).toBe(false);
    expect(embedder.getVocabSize()).toBe(0);
  });

  test('fit builds vocabulary', () => {
    embedder.fit(['javascript testing', 'python coding']);
    expect(embedder.isFitted()).toBe(true);
    expect(embedder.getVocabSize()).toBeGreaterThan(0);
  });

  test('embed throws if not fitted', () => {
    expect(() => embedder.embed('hello')).toThrow('Embedder not fitted');
  });

  test('embed returns vector and terms', () => {
    embedder.fit(['javascript testing framework', 'python coding language']);
    const result = embedder.embed('javascript testing');
    expect(result.vector).toBeInstanceOf(Array);
    expect(result.terms).toBeInstanceOf(Array);
    expect(result.vector.length).toBe(embedder.getVocabSize());
  });

  test('embed produces non-zero vector for known terms', () => {
    embedder.fit(['javascript testing', 'python coding']);
    const { vector } = embedder.embed('javascript testing');
    const hasNonZero = vector.some(v => v > 0);
    expect(hasNonZero).toBe(true);
  });

  test('embed produces zero vector for unknown terms', () => {
    embedder.fit(['javascript testing', 'python coding']);
    const { vector } = embedder.embed('xylophone zebra quantum');
    const allZero = vector.every(v => v === 0);
    expect(allZero).toBe(true);
  });

  test('similar documents have higher similarity than different ones', () => {
    embedder.fit([
      'javascript react frontend development',
      'javascript angular frontend framework',
      'python machine learning backend server',
    ]);
    const js1 = embedder.embed('javascript react frontend development');
    const js2 = embedder.embed('javascript angular frontend framework');
    const py = embedder.embed('python machine learning backend server');

    const simJsJs = cosineSimilarity(js1.vector, js2.vector);
    const simJsPy = cosineSimilarity(js1.vector, py.vector);
    expect(simJsJs).toBeGreaterThan(simJsPy);
  });

  test('export and import preserve state', () => {
    embedder.fit(['hello world', 'test code']);
    const exported = embedder.export();

    const newEmbedder = new Embedder();
    newEmbedder.import(exported);

    expect(newEmbedder.isFitted()).toBe(true);
    expect(newEmbedder.getVocabSize()).toBe(embedder.getVocabSize());

    const orig = embedder.embed('hello world');
    const restored = newEmbedder.embed('hello world');
    expect(cosineSimilarity(orig.vector, restored.vector)).toBeCloseTo(1.0);
  });
});

describe('cosineSimilarity', () => {
  test('identical vectors return 1', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1.0);
  });

  test('orthogonal vectors return 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  test('zero vectors return 0', () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  test('different length vectors return 0', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  test('returns value between 0 and 1 for positive vectors', () => {
    const sim = cosineSimilarity([1, 2, 3], [4, 5, 6]);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThanOrEqual(1);
  });
});
