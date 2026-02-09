'use strict';

const { SemanticSearch } = require('../../lib/semantic/search');

describe('SemanticSearch', () => {
  let search;

  const sampleDocs = [
    { id: 'doc1', text: 'javascript react frontend development web application', type: 'code' },
    { id: 'doc2', text: 'python machine learning data science algorithms', type: 'code' },
    { id: 'doc3', text: 'project management agile scrum sprint planning', type: 'process' },
    { id: 'doc4', text: 'javascript nodejs backend api server express', type: 'code' },
    { id: 'doc5', text: 'testing unit integration end-to-end quality assurance', type: 'process' },
  ];

  beforeEach(() => {
    search = new SemanticSearch();
  });

  test('starts unindexed', () => {
    expect(search.isIndexed()).toBe(false);
    expect(search.getIndexSize()).toBe(0);
    expect(search.getVocabSize()).toBe(0);
  });

  test('buildIndex indexes documents', () => {
    search.buildIndex(sampleDocs);
    expect(search.isIndexed()).toBe(true);
    expect(search.getIndexSize()).toBe(5);
    expect(search.getVocabSize()).toBeGreaterThan(0);
  });

  test('search throws if not indexed', () => {
    expect(() => search.search('test')).toThrow('Index not built');
  });

  test('search returns relevant results', () => {
    search.buildIndex(sampleDocs);
    const results = search.search('javascript frontend');
    expect(results.length).toBeGreaterThan(0);
    // doc1 (react frontend) should rank high
    const topIds = results.slice(0, 2).map(r => r.id);
    expect(topIds).toContain('doc1');
  });

  test('search results have score property', () => {
    search.buildIndex(sampleDocs);
    const results = search.search('javascript');
    for (const r of results) {
      expect(r).toHaveProperty('score');
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('text');
      expect(r).toHaveProperty('type');
      expect(typeof r.score).toBe('number');
    }
  });

  test('search respects limit', () => {
    search.buildIndex(sampleDocs);
    const results = search.search('code development', { limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('search respects minScore', () => {
    search.buildIndex(sampleDocs);
    const results = search.search('javascript', { minScore: 0.5 });
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0.5);
    }
  });

  test('search filters by type', () => {
    search.buildIndex(sampleDocs);
    const results = search.search('planning development', { type: 'process' });
    for (const r of results) {
      expect(r.type).toBe('process');
    }
  });

  test('search results are sorted by score descending', () => {
    search.buildIndex(sampleDocs);
    const results = search.search('javascript');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  test('findSimilar throws if not indexed', () => {
    expect(() => search.findSimilar('doc1')).toThrow('Index not built');
  });

  test('findSimilar returns similar documents', () => {
    search.buildIndex(sampleDocs);
    const results = search.findSimilar('doc1');
    expect(results.length).toBeGreaterThan(0);
    // Should not include the source doc itself
    const ids = results.map(r => r.id);
    expect(ids).not.toContain('doc1');
    // doc4 (also javascript) should rank high
    expect(ids[0]).toBe('doc4');
  });

  test('findSimilar respects limit', () => {
    search.buildIndex(sampleDocs);
    const results = search.findSimilar('doc1', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('findSimilar returns empty for unknown docId', () => {
    search.buildIndex(sampleDocs);
    expect(search.findSimilar('unknown')).toEqual([]);
  });

  test('export returns index state', () => {
    search.buildIndex(sampleDocs);
    const exported = search.export();
    expect(exported).toHaveProperty('embedder');
    expect(exported).toHaveProperty('index');
    expect(exported.index.length).toBe(5);
    // Exported index should not include vectors (only id, text, type, metadata)
    for (const doc of exported.index) {
      expect(doc).toHaveProperty('id');
      expect(doc).toHaveProperty('text');
      expect(doc).not.toHaveProperty('vector');
    }
  });

  test('search with no matches returns empty array', () => {
    search.buildIndex(sampleDocs);
    const results = search.search('xylophone quantum zebra', { minScore: 0.5 });
    expect(results).toEqual([]);
  });
});
