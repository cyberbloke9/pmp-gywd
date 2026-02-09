'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ContextInjector } = require('../../lib/semantic/context-injector');

describe('ContextInjector', () => {
  let injector;
  let tmpDir;

  beforeEach(() => {
    // Create temp directory simulating ~/.gywd/global/
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gywd-ctx-test-'));
    const globalDir = path.join(tmpDir, '.gywd', 'global');
    fs.mkdirSync(globalDir, { recursive: true });

    // Write sample patterns
    fs.writeFileSync(path.join(globalDir, 'patterns.json'), JSON.stringify([
      { id: 'p1', type: 'consensus', pattern: 'Use TypeScript for type safety', confidence: 0.9, occurrences: 5 },
      { id: 'p2', type: 'emerging', pattern: 'Prefer functional components in React', confidence: 0.7, occurrences: 3 },
      { id: 'p3', type: 'consensus', pattern: 'Write unit tests before integration tests', confidence: 0.85, occurrences: 8 },
    ]));

    // Write sample expertise
    fs.writeFileSync(path.join(globalDir, 'expertise.json'), JSON.stringify({
      javascript: { level: 'expert', observations: 50 },
      python: { level: 'intermediate', observations: 20 },
      testing: { level: 'advanced', observations: 35 },
    }));

    // Write sample projects
    fs.writeFileSync(path.join(globalDir, 'projects.json'), JSON.stringify([
      { name: 'frontend-app', path: '/projects/frontend', accessCount: 15, metadata: { languages: ['javascript', 'typescript'] } },
      { name: 'ml-pipeline', path: '/projects/ml', accessCount: 8, metadata: { languages: ['python'] } },
    ]));

    // Monkey-patch the GLOBAL_DIR constant used by context-injector
    // Since it uses path.join(os.homedir(), '.gywd', 'global'), we override homedir
    jest.spyOn(os, 'homedir').mockReturnValue(tmpDir);

    injector = new ContextInjector();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('starts not ready', () => {
    // Create fresh injector without loading
    const fresh = new ContextInjector();
    // Note: isReady checks _ready which starts false
    expect(fresh.isReady()).toBe(false);
  });

  test('load indexes data and becomes ready', () => {
    injector.load();
    expect(injector.isReady()).toBe(true);
  });

  test('getStats returns index info', () => {
    injector.load();
    const stats = injector.getStats();
    expect(stats.ready).toBe(true);
    expect(stats.indexSize).toBe(8); // 3 patterns + 3 expertise + 2 projects
    expect(stats.vocabSize).toBeGreaterThan(0);
  });

  test('getContext returns categorized results', () => {
    injector.load();
    const ctx = injector.getContext('TypeScript type safety');
    expect(ctx).toHaveProperty('patterns');
    expect(ctx).toHaveProperty('expertise');
    expect(ctx).toHaveProperty('projects');
    expect(Array.isArray(ctx.patterns)).toBe(true);
    expect(Array.isArray(ctx.expertise)).toBe(true);
    expect(Array.isArray(ctx.projects)).toBe(true);
  });

  test('getContext finds relevant patterns', () => {
    injector.load();
    const ctx = injector.getContext('TypeScript type safety');
    expect(ctx.patterns.length).toBeGreaterThan(0);
    // The TypeScript pattern should be most relevant
    const topPattern = ctx.patterns[0];
    expect(topPattern.text).toContain('TypeScript');
  });

  test('getContext finds relevant expertise', () => {
    injector.load();
    const ctx = injector.getContext('javascript frontend development');
    expect(ctx.expertise.length).toBeGreaterThan(0);
  });

  test('getContext finds relevant projects', () => {
    injector.load();
    const ctx = injector.getContext('javascript frontend');
    expect(ctx.projects.length).toBeGreaterThan(0);
  });

  test('getContext auto-loads if not ready', () => {
    // Don't call load() explicitly — getContext triggers auto-load
    const ctx = injector.getContext('TypeScript type safety');
    expect(injector.isReady()).toBe(true);
    // Should have loaded data and found results
    const totalResults = ctx.patterns.length + ctx.expertise.length + ctx.projects.length;
    expect(totalResults).toBeGreaterThan(0);
  });

  test('getContext respects limit option', () => {
    injector.load();
    const ctx = injector.getContext('testing code', { limit: 1 });
    expect(ctx.patterns.length).toBeLessThanOrEqual(1);
    expect(ctx.expertise.length).toBeLessThanOrEqual(1);
    expect(ctx.projects.length).toBeLessThanOrEqual(1);
  });

  test('getContextString returns formatted string', () => {
    injector.load();
    const str = injector.getContextString('TypeScript type safety');
    expect(typeof str).toBe('string');
    expect(str.length).toBeGreaterThan(0);
    expect(str).toContain('Relevant');
  });

  test('getContextString includes sections with headers', () => {
    injector.load();
    const str = injector.getContextString('javascript testing');
    // Should have at least one section header
    const hasHeader = str.includes('## Relevant Patterns') ||
                      str.includes('## Relevant Expertise') ||
                      str.includes('## Related Projects');
    expect(hasHeader).toBe(true);
  });

  test('getContextString includes relevance percentages', () => {
    injector.load();
    const str = injector.getContextString('TypeScript type safety');
    // Should have percentage like "(relevance: 45%)"
    expect(str).toMatch(/relevance: \d+%/);
  });

  test('handles missing files gracefully', () => {
    // Remove the files
    const globalDir = path.join(tmpDir, '.gywd', 'global');
    fs.unlinkSync(path.join(globalDir, 'patterns.json'));
    fs.unlinkSync(path.join(globalDir, 'expertise.json'));
    fs.unlinkSync(path.join(globalDir, 'projects.json'));

    const fresh = new ContextInjector();
    fresh.load();
    expect(fresh.isReady()).toBe(true);
    const ctx = fresh.getContext('anything');
    expect(ctx.patterns).toEqual([]);
    expect(ctx.expertise).toEqual([]);
    expect(ctx.projects).toEqual([]);
  });

  test('handles empty data files gracefully', () => {
    const globalDir = path.join(tmpDir, '.gywd', 'global');
    fs.writeFileSync(path.join(globalDir, 'patterns.json'), '[]');
    fs.writeFileSync(path.join(globalDir, 'expertise.json'), '{}');
    fs.writeFileSync(path.join(globalDir, 'projects.json'), '[]');

    const fresh = new ContextInjector();
    fresh.load();
    expect(fresh.isReady()).toBe(true);
    const str = fresh.getContextString('anything');
    expect(str).toBe('No relevant context found.');
  });
});
