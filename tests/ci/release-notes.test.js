'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ReleaseNotesGenerator } = require('../../lib/ci/release-notes');

describe('ReleaseNotesGenerator', () => {
  let tmpDir;
  let planningDir;
  let globalDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gywd-rn-test-'));
    planningDir = path.join(tmpDir, '.planning');
    globalDir = path.join(tmpDir, '.gywd', 'global');
    fs.mkdirSync(planningDir, { recursive: true });
    fs.mkdirSync(globalDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeGenerator(opts = {}) {
    return new ReleaseNotesGenerator({
      projectRoot: tmpDir,
      planningDir,
      globalDir,
      ...opts,
    });
  }

  describe('generate', () => {
    test('returns data and markdown', () => {
      const gen = makeGenerator();
      const result = gen.generate({ version: '5.0.0' });
      expect(result.data).toBeDefined();
      expect(result.markdown).toBeDefined();
      expect(result.data.version).toBe('5.0.0');
    });

    test('detects version from package.json', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test', version: '4.2.0' }));
      const gen = makeGenerator();
      const result = gen.generate();
      expect(result.data.version).toBe('4.2.0');
    });

    test('defaults to 0.0.0 without package.json', () => {
      const gen = makeGenerator();
      const result = gen.generate();
      expect(result.data.version).toBe('0.0.0');
    });

    test('includes custom highlights', () => {
      const gen = makeGenerator();
      const result = gen.generate({
        version: '5.0.0',
        highlights: ['Web dashboard', 'Multi-model support'],
      });
      expect(result.data.highlights).toEqual(['Web dashboard', 'Multi-model support']);
      expect(result.markdown).toContain('Web dashboard');
    });

    test('includes date', () => {
      const gen = makeGenerator();
      const result = gen.generate({ version: '1.0.0' });
      expect(result.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('phases', () => {
    test('extracts completed phases from ROADMAP.md', () => {
      fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), `
#### Phase 43: web-dashboard-core ✅

- [x] 43-01: Next.js scaffold
- [x] 43-02: Dashboard layout

**Deliverables:** dashboard/ — 43 files

#### Phase 44: web-dashboard-charts ✅

- [x] 44-01: Timeline chart
- [ ] 44-02: Heatmap
`);
      const gen = makeGenerator();
      const result = gen.generate({ version: '5.0.0' });
      expect(result.data.phases.length).toBe(2);
      expect(result.data.phases[0].number).toBe(43);
      expect(result.data.phases[0].completedItems).toBe(2);
      expect(result.data.phases[0].deliverables).toContain('dashboard/');
      expect(result.data.phases[1].completedItems).toBe(1);
    });

    test('returns empty array without ROADMAP.md', () => {
      const gen = makeGenerator();
      const result = gen.generate();
      expect(result.data.phases).toEqual([]);
    });
  });

  describe('decisions', () => {
    test('extracts decisions from phase summaries', () => {
      const phaseDir = path.join(planningDir, 'phases', '43-dashboard');
      fs.mkdirSync(phaseDir, { recursive: true });
      fs.writeFileSync(path.join(phaseDir, '43-01-SUMMARY.md'), `
## Key Decisions
- **Next.js over Remix** - better SSR support
- **Tailwind CSS** - utility-first approach
`);
      const gen = makeGenerator();
      const result = gen.generate();
      expect(result.data.decisions.length).toBe(2);
      expect(result.data.decisions[0].decision).toBe('Next.js over Remix');
      expect(result.data.decisions[0].rationale).toContain('SSR');
    });

    test('handles missing phases directory', () => {
      const gen = makeGenerator();
      const result = gen.generate();
      expect(result.data.decisions).toEqual([]);
    });

    test('can be disabled', () => {
      const phaseDir = path.join(planningDir, 'phases', '43-dashboard');
      fs.mkdirSync(phaseDir, { recursive: true });
      fs.writeFileSync(path.join(phaseDir, '43-01-SUMMARY.md'),
        '## Decisions\n- **Some decision**\n');
      const gen = makeGenerator();
      const result = gen.generate({ includeDecisions: false });
      expect(result.data.decisions).toEqual([]);
    });
  });

  describe('patterns', () => {
    test('summarizes patterns from patterns.json', () => {
      fs.writeFileSync(path.join(globalDir, 'patterns.json'), JSON.stringify([
        { type: 'testing', confidence: 0.9 },
        { type: 'testing', confidence: 0.8 },
        { type: 'architecture', confidence: 0.5 },
      ]));
      const gen = makeGenerator();
      const result = gen.generate();
      expect(result.data.patterns.total).toBe(3);
      expect(result.data.patterns.highConfidence).toBe(2);
      expect(result.data.patterns.byType.testing).toBe(2);
      expect(result.data.patterns.byType.architecture).toBe(1);
    });

    test('returns null without patterns.json', () => {
      const gen = makeGenerator();
      const result = gen.generate();
      expect(result.data.patterns).toBeNull();
    });

    test('can be disabled', () => {
      fs.writeFileSync(path.join(globalDir, 'patterns.json'), JSON.stringify([
        { type: 'test', confidence: 0.5 },
      ]));
      const gen = makeGenerator();
      const result = gen.generate({ includePatterns: false });
      expect(result.data.patterns).toBeNull();
    });
  });

  describe('stats', () => {
    test('extracts stats from STATE.md', () => {
      fs.writeFileSync(path.join(planningDir, 'STATE.md'), `
| Metric | Value |
|--------|-------|
| Version | v5.0.0 |
| Commands | 47 |
| Tests | 1,227 |
`);
      const gen = makeGenerator();
      const result = gen.generate();
      expect(result.data.stats.version).toBe('v5.0.0');
      expect(result.data.stats.commands).toBe('47');
      expect(result.data.stats.tests).toBe('1,227');
    });

    test('returns null without STATE.md', () => {
      const gen = makeGenerator();
      const result = gen.generate();
      expect(result.data.stats).toBeNull();
    });

    test('can be disabled', () => {
      fs.writeFileSync(path.join(planningDir, 'STATE.md'), '| Metric | Value |\n| X | Y |');
      const gen = makeGenerator();
      const result = gen.generate({ includeStats: false });
      expect(result.data.stats).toBeNull();
    });
  });

  describe('markdown rendering', () => {
    test('includes all sections', () => {
      fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), `
#### Phase 50: enterprise-features ✅
- [x] 50-01: SSO
**Deliverables:** lib/enterprise/
`);
      fs.writeFileSync(path.join(planningDir, 'STATE.md'), `
| Metric | Value |
|--------|-------|
| Tests | 1000 |
`);
      fs.writeFileSync(path.join(globalDir, 'patterns.json'),
        JSON.stringify([{ type: 'test', confidence: 0.9 }]));

      const gen = makeGenerator();
      const result = gen.generate({
        version: '5.0.0',
        highlights: ['Enterprise features'],
      });

      expect(result.markdown).toContain('Release 5.0.0');
      expect(result.markdown).toContain('Highlights');
      expect(result.markdown).toContain('Enterprise features');
      expect(result.markdown).toContain('Phases Completed');
      expect(result.markdown).toContain('Pattern Summary');
      expect(result.markdown).toContain('Project Stats');
      expect(result.markdown).toContain('Generated by GYWD');
    });

    test('omits empty sections', () => {
      const gen = makeGenerator();
      const result = gen.generate({ version: '1.0.0' });
      expect(result.markdown).not.toContain('Highlights');
      expect(result.markdown).not.toContain('Key Decisions');
      expect(result.markdown).not.toContain('Breaking Changes');
    });
  });
});
