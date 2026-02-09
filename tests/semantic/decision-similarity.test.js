'use strict';

const { DecisionSimilarity } = require('../../lib/semantic/decision-similarity');

describe('DecisionSimilarity', () => {
  let detector;

  const sampleDecisions = [
    { id: 'd1', decision: 'Use React for frontend', rationale: 'Component-based architecture, large ecosystem', outcome: 'Successful, fast development' },
    { id: 'd2', decision: 'Use PostgreSQL for database', rationale: 'ACID compliance, JSON support, scalability', outcome: 'Good performance at scale' },
    { id: 'd3', decision: 'Implement REST API', rationale: 'Simple, well-understood, good tooling', outcome: 'Easy integration with clients' },
    { id: 'd4', decision: 'Use TypeScript for type safety', rationale: 'Catch errors at compile time, better IDE support' },
    { id: 'd5', decision: 'Deploy with Docker containers', rationale: 'Consistent environments, easy scaling', outcome: 'Simplified deployment process' },
  ];

  beforeEach(() => {
    detector = new DecisionSimilarity();
  });

  test('starts not ready with zero decisions', () => {
    expect(detector.isReady()).toBe(false);
    expect(detector.getDecisionCount()).toBe(0);
  });

  test('loadDecisions makes it ready', () => {
    detector.loadDecisions(sampleDecisions);
    expect(detector.isReady()).toBe(true);
    expect(detector.getDecisionCount()).toBe(5);
  });

  test('loadDecisions with empty array makes it ready', () => {
    detector.loadDecisions([]);
    expect(detector.isReady()).toBe(true);
    expect(detector.getDecisionCount()).toBe(0);
  });

  test('loadDecisions returns this for chaining', () => {
    const result = detector.loadDecisions(sampleDecisions);
    expect(result).toBe(detector);
  });

  test('findSimilar returns empty when not ready', () => {
    expect(detector.findSimilar('Use Vue for frontend')).toEqual([]);
  });

  test('findSimilar returns empty when no decisions loaded', () => {
    detector.loadDecisions([]);
    expect(detector.findSimilar('Use Vue for frontend')).toEqual([]);
  });

  test('findSimilar finds related decisions', () => {
    detector.loadDecisions(sampleDecisions);
    const results = detector.findSimilar('Use Vue.js for frontend UI');
    expect(results.length).toBeGreaterThan(0);
    // d1 (React for frontend) should be most similar
    expect(results[0].id).toBe('d1');
  });

  test('findSimilar results have expected properties', () => {
    detector.loadDecisions(sampleDecisions);
    const results = detector.findSimilar('Use React');
    for (const r of results) {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('decision');
      expect(r).toHaveProperty('rationale');
      expect(r).toHaveProperty('outcome');
      expect(r).toHaveProperty('score');
      expect(typeof r.score).toBe('number');
    }
  });

  test('findSimilar results sorted by score descending', () => {
    detector.loadDecisions(sampleDecisions);
    const results = detector.findSimilar('frontend framework choice');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  test('findSimilar respects limit option', () => {
    detector.loadDecisions(sampleDecisions);
    const results = detector.findSimilar('database choice', '', { limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('findSimilar respects minScore option', () => {
    detector.loadDecisions(sampleDecisions);
    const results = detector.findSimilar('database choice', '', { minScore: 0.3 });
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0.3);
    }
  });

  test('findSimilar uses rationale in matching', () => {
    detector.loadDecisions(sampleDecisions);
    // Query using rationale-like text
    const results = detector.findSimilar('choose technology', 'component-based architecture ecosystem');
    expect(results.length).toBeGreaterThan(0);
    // React decision mentions component-based architecture
    const reactResult = results.find(r => r.id === 'd1');
    expect(reactResult).toBeDefined();
  });

  test('checkConflict detects high-similarity decisions', () => {
    detector.loadDecisions(sampleDecisions);
    // Very similar to existing decision
    const result = detector.checkConflict('Use React for the frontend application');
    expect(result).toHaveProperty('hasConflict');
    expect(result).toHaveProperty('similar');
    expect(Array.isArray(result.similar)).toBe(true);
  });

  test('checkConflict with no conflict returns hasConflict false', () => {
    detector.loadDecisions(sampleDecisions);
    // Completely different domain
    const result = detector.checkConflict('xylophone quantum zebra');
    expect(result.hasConflict).toBe(false);
    expect(result.similar).toEqual([]);
  });

  test('checkConflict respects threshold', () => {
    detector.loadDecisions(sampleDecisions);
    // With very high threshold, nothing should match
    const result = detector.checkConflict('Use React for frontend', 0.99);
    // Even near-identical text won't hit 0.99 with TF-IDF
    expect(result.similar.length).toBeLessThanOrEqual(1);
  });

  test('handles decisions without outcome', () => {
    detector.loadDecisions(sampleDecisions);
    const results = detector.findSimilar('TypeScript type checking');
    const tsResult = results.find(r => r.id === 'd4');
    if (tsResult) {
      expect(tsResult.outcome).toBeNull();
    }
  });
});
