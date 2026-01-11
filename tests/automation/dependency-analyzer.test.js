/**
 * Dependency Analyzer Tests
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  DependencyAnalyzer,
  DEP_TYPES,
  BUILTIN_MODULES,
} = require('../../lib/automation');

describe('DependencyAnalyzer', () => {
  let analyzer;
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep-analyzer-test-'));
    analyzer = new DependencyAnalyzer({ rootDir: testDir });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    test('uses default options', () => {
      const defaultAnalyzer = new DependencyAnalyzer();
      expect(defaultAnalyzer.extensions).toContain('.js');
      expect(defaultAnalyzer.excludeDirs).toContain('node_modules');
    });

    test('accepts custom options', () => {
      const custom = new DependencyAnalyzer({
        rootDir: '/custom',
        extensions: ['.ts'],
        excludeDirs: ['dist'],
      });
      expect(custom.rootDir).toBe('/custom');
      expect(custom.extensions).toEqual(['.ts']);
    });
  });

  describe('extractDependencies', () => {
    test('extracts ES6 imports', () => {
      const content = `
        import { foo } from './foo';
        import bar from './bar';
        import * as baz from './baz';
      `;
      const deps = analyzer.extractDependencies(content, '/src');

      expect(deps.length).toBe(3);
      expect(deps.every(d => d.type === DEP_TYPES.INTERNAL)).toBe(true);
    });

    test('extracts CommonJS requires', () => {
      const content = `
        const foo = require('./foo');
        const { bar } = require('./bar');
      `;
      const deps = analyzer.extractDependencies(content, '/src');

      expect(deps.length).toBe(2);
    });

    test('extracts dynamic imports', () => {
      const content = `
        const mod = await import('./dynamic');
      `;
      const deps = analyzer.extractDependencies(content, '/src');

      expect(deps.length).toBe(1);
    });

    test('identifies external packages', () => {
      const content = `
        import express from 'express';
        const lodash = require('lodash');
      `;
      const deps = analyzer.extractDependencies(content, '/src');

      expect(deps.length).toBe(2);
      expect(deps.every(d => d.type === DEP_TYPES.EXTERNAL)).toBe(true);
      expect(deps.map(d => d.path)).toContain('express');
      expect(deps.map(d => d.path)).toContain('lodash');
    });

    test('identifies built-in modules', () => {
      const content = `
        const fs = require('fs');
        const path = require('path');
        import os from 'os';
      `;
      const deps = analyzer.extractDependencies(content, '/src');

      expect(deps.length).toBe(3);
      expect(deps.every(d => d.type === DEP_TYPES.BUILTIN)).toBe(true);
    });

    test('handles node: prefix', () => {
      const content = `
        import fs from 'node:fs';
        const path = require('node:path');
      `;
      const deps = analyzer.extractDependencies(content, '/src');

      expect(deps.length).toBe(2);
      expect(deps.every(d => d.type === DEP_TYPES.BUILTIN)).toBe(true);
    });

    test('deduplicates imports', () => {
      const content = `
        import { foo } from './utils';
        import { bar } from './utils';
        const utils = require('./utils');
      `;
      const deps = analyzer.extractDependencies(content, '/src');

      expect(deps.length).toBe(1);
    });
  });

  describe('classifyDependency', () => {
    test('classifies relative paths as internal', () => {
      const dep = analyzer.classifyDependency('./utils', '/src');
      expect(dep.type).toBe(DEP_TYPES.INTERNAL);
    });

    test('classifies npm packages as external', () => {
      const dep = analyzer.classifyDependency('express', '/src');
      expect(dep.type).toBe(DEP_TYPES.EXTERNAL);
      expect(dep.path).toBe('express');
    });

    test('handles scoped packages', () => {
      const dep = analyzer.classifyDependency('@scope/package', '/src');
      expect(dep.type).toBe(DEP_TYPES.EXTERNAL);
      expect(dep.path).toBe('@scope');
    });
  });

  describe('analyze', () => {
    beforeEach(() => {
      // Create test files
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'src', 'index.js'),
        `const utils = require('./utils');\nmodule.exports = { main: () => {} };`,
      );
      fs.writeFileSync(
        path.join(testDir, 'src', 'utils.js'),
        `const fs = require('fs');\nmodule.exports = { helper: () => {} };`,
      );
    });

    test('analyzes directory and returns results', () => {
      const result = analyzer.analyze();

      expect(result.files).toBe(2);
      expect(result.dependencies).toBeDefined();
      expect(result.circular).toEqual([]);
      expect(result.independent).toBeDefined();
      expect(result.coupling).toBeDefined();
      expect(result.layers).toBeDefined();
    });

    test('counts dependency types', () => {
      const result = analyzer.analyze();

      expect(result.dependencies.internal).toBeGreaterThanOrEqual(0);
      expect(result.dependencies.builtin).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findCircularDependencies', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    });

    test('detects circular dependencies', () => {
      // Create circular: a -> b -> a
      fs.writeFileSync(
        path.join(testDir, 'src', 'a.js'),
        `const b = require('./b');`,
      );
      fs.writeFileSync(
        path.join(testDir, 'src', 'b.js'),
        `const a = require('./a');`,
      );

      const result = analyzer.analyze();

      expect(result.circular.length).toBeGreaterThan(0);
    });

    test('returns empty for no cycles', () => {
      fs.writeFileSync(
        path.join(testDir, 'src', 'a.js'),
        `const b = require('./b');`,
      );
      fs.writeFileSync(
        path.join(testDir, 'src', 'b.js'),
        `module.exports = {};`,
      );

      const result = analyzer.analyze();

      expect(result.circular.length).toBe(0);
    });
  });

  describe('findIndependentModules', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    });

    test('identifies modules with no internal deps', () => {
      fs.writeFileSync(
        path.join(testDir, 'src', 'independent.js'),
        `const fs = require('fs');\nmodule.exports = {};`,
      );
      fs.writeFileSync(
        path.join(testDir, 'src', 'dependent.js'),
        `const ind = require('./independent');`,
      );

      const result = analyzer.analyze();

      expect(result.independent).toContain(path.join('src', 'independent.js'));
    });
  });

  describe('calculateCoupling', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    });

    test('calculates afferent and efferent coupling', () => {
      fs.writeFileSync(
        path.join(testDir, 'src', 'a.js'),
        `const b = require('./b');`,
      );
      fs.writeFileSync(
        path.join(testDir, 'src', 'b.js'),
        `module.exports = {};`,
      );

      const result = analyzer.analyze();

      expect(result.coupling.efferent).toBeDefined();
      expect(result.coupling.afferent).toBeDefined();
      expect(result.coupling.instability).toBeDefined();
    });
  });

  describe('detectLayers', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'controllers'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'services'), { recursive: true });
    });

    test('groups files by top-level directory', () => {
      fs.writeFileSync(
        path.join(testDir, 'controllers', 'user.js'),
        `module.exports = {};`,
      );
      fs.writeFileSync(
        path.join(testDir, 'services', 'user.js'),
        `module.exports = {};`,
      );

      const result = analyzer.analyze();

      expect(result.layers).toHaveProperty('controllers');
      expect(result.layers).toHaveProperty('services');
    });
  });

  describe('getDependents', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'src', 'utils.js'),
        `module.exports = {};`,
      );
      fs.writeFileSync(
        path.join(testDir, 'src', 'a.js'),
        `const utils = require('./utils');`,
      );
      fs.writeFileSync(
        path.join(testDir, 'src', 'b.js'),
        `const utils = require('./utils');`,
      );
    });

    test('returns files that depend on given file', () => {
      analyzer.analyze();

      const dependents = analyzer.getDependents(path.join(testDir, 'src', 'utils.js'));

      expect(dependents.length).toBe(2);
    });
  });

  describe('getDependencies', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'src', 'utils.js'),
        `module.exports = {};`,
      );
      fs.writeFileSync(
        path.join(testDir, 'src', 'main.js'),
        `const utils = require('./utils');`,
      );
    });

    test('returns files that given file depends on', () => {
      analyzer.analyze();

      const deps = analyzer.getDependencies(path.join(testDir, 'src', 'main.js'));

      expect(deps.length).toBe(1);
    });
  });

  describe('getTopologicalOrder', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'src', 'c.js'),
        `module.exports = {};`,
      );
      fs.writeFileSync(
        path.join(testDir, 'src', 'b.js'),
        `const c = require('./c');`,
      );
      fs.writeFileSync(
        path.join(testDir, 'src', 'a.js'),
        `const b = require('./b');`,
      );
    });

    test('returns files in build order', () => {
      analyzer.analyze();

      const order = analyzer.getTopologicalOrder();

      // c should come before b, b before a
      const cIdx = order.indexOf(path.join('src', 'c.js'));
      const bIdx = order.indexOf(path.join('src', 'b.js'));
      const aIdx = order.indexOf(path.join('src', 'a.js'));

      expect(cIdx).toBeLessThan(bIdx);
      expect(bIdx).toBeLessThan(aIdx);
    });
  });

  describe('toDot', () => {
    test('generates DOT format graph', () => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'src', 'a.js'),
        `const b = require('./b');`,
      );
      fs.writeFileSync(
        path.join(testDir, 'src', 'b.js'),
        `module.exports = {};`,
      );

      analyzer.analyze();
      const dot = analyzer.toDot();

      expect(dot).toContain('digraph Dependencies');
      expect(dot).toContain('->');
    });
  });

  describe('toMarkdown', () => {
    test('generates markdown report', () => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'src', 'index.js'),
        `const fs = require('fs');`,
      );

      analyzer.analyze();
      const md = analyzer.toMarkdown();

      expect(md).toContain('# Dependency Analysis Report');
      expect(md).toContain('## Summary');
    });
  });

  describe('clear', () => {
    test('clears all data', () => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'a.js'), `module.exports = {};`);

      analyzer.analyze();
      expect(analyzer.dependencies.size).toBeGreaterThan(0);

      analyzer.clear();
      expect(analyzer.dependencies.size).toBe(0);
    });
  });

  describe('export', () => {
    test('exports analysis data', () => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'a.js'), `module.exports = {};`);

      analyzer.analyze();
      const exported = analyzer.export();

      expect(exported.rootDir).toBe(testDir);
      expect(exported.dependencies).toBeDefined();
      expect(exported.analysis).toBeDefined();
    });
  });
});

describe('DEP_TYPES', () => {
  test('has expected values', () => {
    expect(DEP_TYPES.INTERNAL).toBe('internal');
    expect(DEP_TYPES.EXTERNAL).toBe('external');
    expect(DEP_TYPES.BUILTIN).toBe('builtin');
  });
});

describe('BUILTIN_MODULES', () => {
  test('contains common Node.js modules', () => {
    expect(BUILTIN_MODULES.has('fs')).toBe(true);
    expect(BUILTIN_MODULES.has('path')).toBe(true);
    expect(BUILTIN_MODULES.has('os')).toBe(true);
    expect(BUILTIN_MODULES.has('http')).toBe(true);
  });
});
