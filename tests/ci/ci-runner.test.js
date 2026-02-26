'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { CIRunner } = require('../../lib/ci/ci-runner');

describe('CIRunner', () => {
  let tmpDir;
  let planningDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gywd-runner-test-'));
    planningDir = path.join(tmpDir, '.planning');
    fs.mkdirSync(planningDir, { recursive: true });

    // Write minimal STATE.md and package.json for valid checks
    fs.writeFileSync(path.join(planningDir, 'STATE.md'),
      '# State\n## Project Summary\nTest project\n## Current Position\n**Phase:** 1 of 5\n**Status:** Active');
    fs.writeFileSync(path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0', scripts: { test: 'jest', 'test:ci': 'jest --ci' }, devDependencies: { jest: '^29' } }));

    // Create tests dir
    const testsDir = path.join(tmpDir, 'tests');
    fs.mkdirSync(testsDir, { recursive: true });
    fs.writeFileSync(path.join(testsDir, 'sample.test.js'), 'test("x", () => {})');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    test('creates with defaults', () => {
      const runner = new CIRunner();
      expect(runner.projectRoot).toBeDefined();
      expect(runner.outputFormat).toBe('text');
      expect(runner.strict).toBe(false);
    });

    test('accepts custom options', () => {
      const runner = new CIRunner({
        projectRoot: tmpDir,
        outputFormat: 'json',
        strict: true,
      });
      expect(runner.projectRoot).toBe(tmpDir);
      expect(runner.outputFormat).toBe('json');
      expect(runner.strict).toBe(true);
    });
  });

  describe('runValidation', () => {
    test('returns validation result', () => {
      const runner = new CIRunner({ projectRoot: tmpDir, planningDir });
      const result = runner.runValidation();
      expect(result.command).toBe('validate');
      expect(result.report).toBeDefined();
      expect(result.report.passed).toBeDefined();
      expect(result.formatted).toBeDefined();
    });

    test('passes with valid project', () => {
      const runner = new CIRunner({ projectRoot: tmpDir, planningDir });
      const result = runner.runValidation();
      expect(result.report.summary.failed).toBe(0);
    });

    test('supports only option', () => {
      const runner = new CIRunner({ projectRoot: tmpDir, planningDir });
      const result = runner.runValidation({ only: ['test-health'] });
      expect(result.report.results.length).toBe(1);
    });
  });

  describe('generateReleaseNotes', () => {
    test('returns release notes', () => {
      const runner = new CIRunner({ projectRoot: tmpDir, planningDir });
      const result = runner.generateReleaseNotes({ version: '2.0.0' });
      expect(result.command).toBe('release-notes');
      expect(result.data.version).toBe('2.0.0');
      expect(result.markdown).toContain('Release 2.0.0');
    });

    test('detects version from package.json', () => {
      const runner = new CIRunner({ projectRoot: tmpDir, planningDir });
      const result = runner.generateReleaseNotes();
      expect(result.data.version).toBe('1.0.0');
    });
  });

  describe('generateReport', () => {
    test('returns full report with both sections', () => {
      const runner = new CIRunner({ projectRoot: tmpDir, planningDir });
      const result = runner.generateReport();
      expect(result.command).toBe('report');
      expect(result.validation).toBeDefined();
      expect(result.releaseNotes).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.validationPassed).toBeDefined();
      expect(result.summary.version).toBe('1.0.0');
      expect(result.formatted).toContain('GYWD CI Report');
    });

    test('summary includes check counts', () => {
      const runner = new CIRunner({ projectRoot: tmpDir, planningDir });
      const result = runner.generateReport();
      expect(result.summary.checksRun).toBeGreaterThan(0);
      expect(typeof result.summary.checksFailed).toBe('number');
    });
  });

  describe('formatOutput', () => {
    test('json format', () => {
      const runner = new CIRunner({ outputFormat: 'json' });
      const output = runner.formatOutput({ test: 'data' });
      expect(JSON.parse(output)).toEqual({ test: 'data' });
    });

    test('text format with formatted field', () => {
      const runner = new CIRunner({ outputFormat: 'text' });
      const output = runner.formatOutput({ formatted: 'hello world' });
      expect(output).toBe('hello world');
    });

    test('markdown format', () => {
      const runner = new CIRunner({ outputFormat: 'markdown' });
      const output = runner.formatOutput({ formatted: '# Report' });
      expect(output).toBe('# Report');
    });
  });

  describe('static run', () => {
    test('validate command', () => {
      const result = CIRunner.run(['validate', '--project', tmpDir]);
      expect(result.command).toBe('validate');
      expect(result.report).toBeDefined();
    });

    test('release-notes command', () => {
      const result = CIRunner.run(['release-notes', '--project', tmpDir, '--version', '3.0.0']);
      expect(result.command).toBe('release-notes');
      expect(result.data.version).toBe('3.0.0');
    });

    test('report command', () => {
      const result = CIRunner.run(['report', '--project', tmpDir]);
      expect(result.command).toBe('report');
      expect(result.validation).toBeDefined();
      expect(result.releaseNotes).toBeDefined();
    });

    test('unknown command returns error', () => {
      const result = CIRunner.run(['unknown']);
      expect(result.error).toContain('Unknown command');
    });

    test('defaults to validate', () => {
      // First arg '--project' is treated as command, which is unknown
      // So with no args it defaults to validate
      const defaultResult = CIRunner.run([]);
      expect(defaultResult.command).toBe('validate');
    });

    test('strict flag', () => {
      const result = CIRunner.run(['validate', '--project', tmpDir, '--strict']);
      expect(result.command).toBe('validate');
    });

    test('json flag', () => {
      const result = CIRunner.run(['validate', '--project', tmpDir, '--json']);
      expect(result.command).toBe('validate');
    });

    test('only flag', () => {
      const result = CIRunner.run(['validate', '--project', tmpDir, '--only', 'drift,test-health']);
      expect(result.report.results.length).toBe(2);
    });

    test('skip flag', () => {
      const result = CIRunner.run(['validate', '--project', tmpDir, '--skip', 'drift,decisions']);
      const ids = result.report.results.map(r => r.id);
      expect(ids).not.toContain('drift');
      expect(ids).not.toContain('decisions');
    });
  });
});
