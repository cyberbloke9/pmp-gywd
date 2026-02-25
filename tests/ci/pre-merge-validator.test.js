'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { PreMergeValidator, CHECK_STATUS } = require('../../lib/ci/pre-merge-validator');

describe('PreMergeValidator', () => {
  let tmpDir;
  let planningDir;
  let globalDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gywd-ci-test-'));
    planningDir = path.join(tmpDir, '.planning');
    globalDir = path.join(tmpDir, '.gywd', 'global');
    fs.mkdirSync(planningDir, { recursive: true });
    fs.mkdirSync(globalDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeValidator(opts = {}) {
    return new PreMergeValidator({
      projectRoot: tmpDir,
      planningDir,
      globalDir,
      ...opts,
    });
  }

  function writeState(content) {
    fs.writeFileSync(path.join(planningDir, 'STATE.md'), content);
  }

  function writeRoadmap(content) {
    fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), content);
  }

  function writePatterns(data) {
    fs.writeFileSync(path.join(globalDir, 'patterns.json'), JSON.stringify(data));
  }

  function writePackageJson(data) {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(data));
  }

  describe('constructor', () => {
    test('creates with defaults', () => {
      const v = new PreMergeValidator();
      expect(v.projectRoot).toBeDefined();
      expect(v.checks.size).toBeGreaterThan(0);
    });

    test('accepts custom options', () => {
      const v = makeValidator({ strict: true });
      expect(v.strict).toBe(true);
    });
  });

  describe('registerCheck / removeCheck', () => {
    test('registerCheck adds a custom check', () => {
      const v = makeValidator();
      const initialSize = v.checks.size;
      v.registerCheck('custom', 'Custom Check', () => ({
        status: CHECK_STATUS.PASSED,
        message: 'ok',
      }));
      expect(v.checks.size).toBe(initialSize + 1);
    });

    test('removeCheck removes a check', () => {
      const v = makeValidator();
      const initialSize = v.checks.size;
      v.removeCheck('drift');
      expect(v.checks.size).toBe(initialSize - 1);
    });
  });

  describe('validate', () => {
    test('returns report with summary', () => {
      const v = makeValidator();
      const report = v.validate();
      expect(report.passed).toBeDefined();
      expect(report.summary.total).toBeGreaterThan(0);
      expect(report.results).toBeInstanceOf(Array);
      expect(report.timestamp).toBeGreaterThan(0);
    });

    test('respects only option', () => {
      const v = makeValidator();
      const report = v.validate({ only: ['drift'] });
      expect(report.results.length).toBe(1);
      expect(report.results[0].id).toBe('drift');
    });

    test('respects skip option', () => {
      const v = makeValidator();
      const all = v.validate();
      const skipped = v.validate({ skip: ['drift', 'decisions'] });
      expect(skipped.results.length).toBe(all.results.length - 2);
    });

    test('catches check errors', () => {
      const v = makeValidator();
      v.registerCheck('broken', 'Broken', () => { throw new Error('boom'); });
      const report = v.validate({ only: ['broken'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.FAILED);
      expect(report.results[0].message).toContain('boom');
    });

    test('strict mode fails on warnings', () => {
      writeState('# State\n**Phase:** 51 of 52\n**Status:** In Progress');
      // No roadmap → phase alignment will skip, but stale state warning
      const v = makeValidator({ strict: true });
      // Force a warning by adding a custom check
      v.registerCheck('warn-test', 'W', () => ({
        status: CHECK_STATUS.WARNING,
        message: 'test warning',
      }));
      const report = v.validate({ only: ['warn-test'] });
      expect(report.passed).toBe(false);
    });

    test('non-strict mode passes with warnings', () => {
      const v = makeValidator();
      v.registerCheck('warn-test', 'W', () => ({
        status: CHECK_STATUS.WARNING,
        message: 'test warning',
      }));
      const report = v.validate({ only: ['warn-test'] });
      expect(report.passed).toBe(true);
    });
  });

  describe('drift check', () => {
    test('skips when no STATE.md', () => {
      const v = makeValidator();
      const report = v.validate({ only: ['drift'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.SKIPPED);
    });

    test('passes with valid state', () => {
      const today = new Date().toISOString().split('T')[0];
      writeState(`# State\n**Phase:** 51 of 52\n**Status:** In Progress\nLast activity: ${today}`);
      writeRoadmap('## Phase 51: CI/CD\n');
      const v = makeValidator();
      const report = v.validate({ only: ['drift'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.PASSED);
    });

    test('warns on stale state', () => {
      writeState('# State\n**Phase:** 51 of 52\n**Status:** In Progress\nLast activity: 2020-01-01');
      writeRoadmap('## Phase 51\n');
      const v = makeValidator();
      const report = v.validate({ only: ['drift'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.WARNING);
      expect(report.results[0].details).toEqual(expect.arrayContaining([
        expect.stringContaining('stale'),
      ]));
    });

    test('fails on missing phase declaration', () => {
      writeState('# State\nNo phase info here\n**Status:** Ok');
      const v = makeValidator();
      const report = v.validate({ only: ['drift'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.FAILED);
    });
  });

  describe('decisions check', () => {
    test('skips when no decisions', () => {
      const v = makeValidator();
      const report = v.validate({ only: ['decisions'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.SKIPPED);
    });

    test('passes with non-conflicting decisions', () => {
      // Create phase directories with summaries
      const phaseDir = path.join(planningDir, 'phases', '51-ci-cd');
      fs.mkdirSync(phaseDir, { recursive: true });
      fs.writeFileSync(path.join(phaseDir, '51-01-SUMMARY.md'),
        '## Decisions\n- **Jest for testing** - industry standard\n');

      const v = makeValidator();
      const report = v.validate({ only: ['decisions'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.PASSED);
    });

    test('warns on potential conflicts', () => {
      const phase1Dir = path.join(planningDir, 'phases', '10-docs');
      const phase2Dir = path.join(planningDir, 'phases', '20-perf');
      fs.mkdirSync(phase1Dir, { recursive: true });
      fs.mkdirSync(phase2Dir, { recursive: true });

      fs.writeFileSync(path.join(phase1Dir, '10-01-SUMMARY.md'),
        '## Decisions\n- **Use webpack bundler** - fast builds\n');
      fs.writeFileSync(path.join(phase2Dir, '20-01-SUMMARY.md'),
        '## Decisions\n- **Avoid webpack bundler** - too slow\n');

      const v = makeValidator();
      const report = v.validate({ only: ['decisions'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.WARNING);
      expect(report.results[0].details.length).toBeGreaterThan(0);
    });
  });

  describe('test-health check', () => {
    test('skips when no package.json', () => {
      const v = makeValidator();
      const report = v.validate({ only: ['test-health'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.SKIPPED);
    });

    test('fails when no test script', () => {
      writePackageJson({ name: 'test', scripts: {} });
      const v = makeValidator();
      const report = v.validate({ only: ['test-health'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.FAILED);
    });

    test('passes with proper test setup', () => {
      writePackageJson({
        name: 'test',
        scripts: { test: 'jest', 'test:ci': 'jest --ci' },
        devDependencies: { jest: '^29.0.0' },
      });
      // Create tests dir with a test file
      const testsDir = path.join(tmpDir, 'tests');
      fs.mkdirSync(testsDir, { recursive: true });
      fs.writeFileSync(path.join(testsDir, 'sample.test.js'), 'test("x", () => {})');

      const v = makeValidator();
      const report = v.validate({ only: ['test-health'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.PASSED);
    });

    test('warns when missing test:ci script', () => {
      writePackageJson({
        name: 'test',
        scripts: { test: 'jest' },
        devDependencies: { jest: '^29.0.0' },
      });
      const testsDir = path.join(tmpDir, 'tests');
      fs.mkdirSync(testsDir, { recursive: true });
      fs.writeFileSync(path.join(testsDir, 'sample.test.js'), 'test("x", () => {})');

      const v = makeValidator();
      const report = v.validate({ only: ['test-health'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.WARNING);
    });
  });

  describe('patterns check', () => {
    test('skips when no patterns', () => {
      const v = makeValidator();
      const report = v.validate({ only: ['patterns'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.SKIPPED);
    });

    test('passes with good patterns', () => {
      writePatterns([
        { type: 'testing', confidence: 0.8, pattern: 'jest' },
        { type: 'architecture', confidence: 0.9, pattern: 'modular' },
      ]);
      const v = makeValidator();
      const report = v.validate({ only: ['patterns'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.PASSED);
    });

    test('warns on low confidence patterns', () => {
      writePatterns([
        { type: 'testing', confidence: 0.1 },
        { type: 'testing', confidence: 0.2 },
        { type: 'testing', confidence: 0.15 },
      ]);
      const v = makeValidator();
      const report = v.validate({ only: ['patterns'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.WARNING);
    });

    test('warns on patterns missing type', () => {
      writePatterns([
        { confidence: 0.8, pattern: 'something' },
      ]);
      const v = makeValidator();
      const report = v.validate({ only: ['patterns'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.WARNING);
    });
  });

  describe('phase-alignment check', () => {
    test('skips when missing state or roadmap', () => {
      const v = makeValidator();
      const report = v.validate({ only: ['phase-alignment'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.SKIPPED);
    });

    test('passes when aligned', () => {
      writeState('**Phase:** 49 of 52\n[██████████] 94% overall (49/52 phases complete)');
      writeRoadmap('# Roadmap\n');
      const v = makeValidator();
      const report = v.validate({ only: ['phase-alignment'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.PASSED);
    });
  });

  describe('state-integrity check', () => {
    test('skips when no STATE.md', () => {
      const v = makeValidator();
      const report = v.validate({ only: ['state-integrity'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.SKIPPED);
    });

    test('passes with valid state files', () => {
      writeState('# Project State\n## Project Summary\nBuilding stuff\n## Current Position\nPhase 51');
      writePatterns([{ type: 'test', confidence: 0.5 }]);
      const v = makeValidator();
      const report = v.validate({ only: ['state-integrity'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.PASSED);
    });

    test('fails on missing required sections', () => {
      writeState('# Just some text without proper sections');
      const v = makeValidator();
      const report = v.validate({ only: ['state-integrity'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.FAILED);
    });

    test('fails on invalid patterns.json', () => {
      writeState('# State\n## Project Summary\n## Current Position');
      fs.writeFileSync(path.join(globalDir, 'patterns.json'), 'not json');
      const v = makeValidator();
      const report = v.validate({ only: ['state-integrity'] });
      expect(report.results[0].status).toBe(CHECK_STATUS.FAILED);
    });
  });

  describe('formatReport', () => {
    test('generates markdown report', () => {
      writeState('# State\n## Project Summary\n## Current Position\n**Phase:** 51 of 52\n**Status:** Active');
      const v = makeValidator();
      const report = v.validate();
      const md = v.formatReport(report);
      expect(md).toContain('GYWD Pre-Merge Validation Report');
      expect(md).toContain('Result');
    });

    test('includes details for failures', () => {
      writeState('# Bad state');
      const v = makeValidator();
      const report = v.validate({ only: ['state-integrity'] });
      const md = v.formatReport(report);
      expect(md).toContain('missing');
    });
  });
});
