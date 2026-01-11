/**
 * Test Generator Tests
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  TestGenerator,
  TEST_FRAMEWORKS,
} = require('../../lib/automation');

describe('TestGenerator', () => {
  let generator;
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-gen-test-'));
    generator = new TestGenerator({
      testDir: path.join(testDir, 'tests'),
      sourceDir: path.join(testDir, 'lib'),
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    test('uses default options', () => {
      const defaultGen = new TestGenerator();
      expect(defaultGen.framework).toBe(TEST_FRAMEWORKS.JEST);
      expect(defaultGen.testDir).toBe('tests');
    });

    test('accepts custom options', () => {
      const custom = new TestGenerator({
        framework: TEST_FRAMEWORKS.MOCHA,
        testDir: 'spec',
      });
      expect(custom.framework).toBe(TEST_FRAMEWORKS.MOCHA);
      expect(custom.testDir).toBe('spec');
    });
  });

  describe('extractExports', () => {
    test('extracts module.exports object', () => {
      const content = `
        module.exports = {
          foo,
          bar,
          baz: helper,
        };
      `;
      const exports = generator.extractExports(content);

      expect(exports).toContain('foo');
      expect(exports).toContain('bar');
      expect(exports).toContain('baz');
    });

    test('extracts module.exports.name assignments', () => {
      const content = `
        module.exports.foo = function() {};
        module.exports.bar = 42;
      `;
      const exports = generator.extractExports(content);

      expect(exports).toContain('foo');
      expect(exports).toContain('bar');
    });

    test('extracts single module.exports', () => {
      const content = `
        class MyClass {}
        module.exports = MyClass;
      `;
      const exports = generator.extractExports(content);

      expect(exports).toContain('MyClass');
    });

    test('extracts ES6 export declarations', () => {
      const content = `
        export function foo() {}
        export const bar = 1;
        export class Baz {}
      `;
      const exports = generator.extractExports(content);

      expect(exports).toContain('foo');
      expect(exports).toContain('bar');
      expect(exports).toContain('Baz');
    });

    test('extracts ES6 named exports', () => {
      const content = `
        const foo = 1;
        const bar = 2;
        export { foo, bar as baz };
      `;
      const exports = generator.extractExports(content);

      expect(exports).toContain('foo');
      expect(exports).toContain('baz');
    });

    test('extracts default export', () => {
      const content = `
        export default function main() {}
      `;
      const exports = generator.extractExports(content);

      expect(exports).toContain('main');
    });
  });

  describe('extractFunctions', () => {
    test('extracts function declarations', () => {
      const content = `
        function foo() {}
        async function bar(a, b) {}
      `;
      const funcs = generator.extractFunctions(content);

      expect(funcs.length).toBe(2);
      expect(funcs[0].name).toBe('foo');
      expect(funcs[0].params).toEqual([]);
      expect(funcs[1].name).toBe('bar');
      expect(funcs[1].params).toEqual(['a', 'b']);
      expect(funcs[1].async).toBe(true);
    });

    test('extracts function expressions', () => {
      const content = `
        const foo = function(x) {};
        const bar = async function(a, b) {};
      `;
      const funcs = generator.extractFunctions(content);

      expect(funcs.length).toBe(2);
      expect(funcs[0].name).toBe('foo');
      expect(funcs[1].async).toBe(true);
    });

    test('extracts arrow functions', () => {
      const content = `
        const foo = (x) => x * 2;
        const bar = async (a, b) => {};
      `;
      const funcs = generator.extractFunctions(content);

      expect(funcs.length).toBe(2);
      expect(funcs[0].name).toBe('foo');
      expect(funcs[1].async).toBe(true);
    });
  });

  describe('extractClasses', () => {
    test('extracts class declarations', () => {
      const content = `
        class Foo {
          constructor() {}
          bar() {}
          baz(x, y) {}
        }
      `;
      const classes = generator.extractClasses(content);

      expect(classes.length).toBe(1);
      expect(classes[0].name).toBe('Foo');
      expect(classes[0].methods.length).toBe(2); // Excludes constructor
    });

    test('extracts static methods', () => {
      const content = `
        class Foo {
          static create() {}
          static async createAsync(opts) {}
        }
      `;
      const classes = generator.extractClasses(content);

      expect(classes[0].methods.length).toBe(2);
      expect(classes[0].methods[0].static).toBe(true);
      expect(classes[0].methods[1].async).toBe(true);
    });

    test('extracts extended classes', () => {
      const content = `
        class Foo extends Bar {
          method() {}
        }
      `;
      const classes = generator.extractClasses(content);

      expect(classes[0].name).toBe('Foo');
      expect(classes[0].extends).toBe('Bar');
    });

    test('skips private methods', () => {
      const content = `
        class Foo {
          publicMethod() {}
          _privateMethod() {}
        }
      `;
      const classes = generator.extractClasses(content);

      expect(classes[0].methods.length).toBe(1);
      expect(classes[0].methods[0].name).toBe('publicMethod');
    });
  });

  describe('parseParams', () => {
    test('parses simple params', () => {
      const params = generator.parseParams('a, b, c');
      expect(params).toEqual(['a', 'b', 'c']);
    });

    test('handles default values', () => {
      const params = generator.parseParams('a = 1, b = "test"');
      expect(params).toEqual(['a', 'b']);
    });

    test('handles destructuring', () => {
      const params = generator.parseParams('{ x, y }, [a, b]');
      // Destructured params are flattened to individual names
      expect(params).toEqual(['x', 'y', 'a', 'b']);
    });

    test('returns empty for empty string', () => {
      const params = generator.parseParams('');
      expect(params).toEqual([]);
    });
  });

  describe('analyzeFile', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'lib'), { recursive: true });
    });

    test('analyzes source file', () => {
      const filePath = path.join(testDir, 'lib', 'module.js');
      fs.writeFileSync(filePath, `
        function foo() {}
        class Bar { method() {} }
        module.exports = { foo, Bar };
      `);

      const analysis = generator.analyzeFile(filePath);

      expect(analysis.exports).toContain('foo');
      expect(analysis.exports).toContain('Bar');
      expect(analysis.testable.length).toBe(2);
    });

    test('returns error for missing file', () => {
      const analysis = generator.analyzeFile('/nonexistent.js');
      expect(analysis.error).toBeDefined();
    });
  });

  describe('identifyTestable', () => {
    test('identifies exported functions', () => {
      const exports = ['foo', 'bar'];
      const functions = [
        { name: 'foo', params: [], async: false },
        { name: 'helper', params: [], async: false },
      ];
      const classes = [];

      const testable = generator.identifyTestable(exports, functions, classes);

      expect(testable.length).toBe(1);
      expect(testable[0].name).toBe('foo');
      expect(testable[0].type).toBe('function');
    });

    test('identifies exported classes', () => {
      const exports = ['MyClass'];
      const functions = [];
      const classes = [{ name: 'MyClass', methods: [] }];

      const testable = generator.identifyTestable(exports, functions, classes);

      expect(testable.length).toBe(1);
      expect(testable[0].name).toBe('MyClass');
      expect(testable[0].type).toBe('class');
    });
  });

  describe('generateTestContent', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'lib'), { recursive: true });
    });

    test('generates Jest test content', () => {
      const filePath = path.join(testDir, 'lib', 'utils.js');
      fs.writeFileSync(filePath, `
        function helper(x) { return x * 2; }
        module.exports = { helper };
      `);

      const content = generator.generateTestContent(filePath);

      expect(content).toContain("describe('helper'");
      expect(content).toContain('expect(result).toBeDefined()');
    });

    test('generates async test for async functions', () => {
      const filePath = path.join(testDir, 'lib', 'async.js');
      fs.writeFileSync(filePath, `
        async function fetchData() {}
        module.exports = { fetchData };
      `);

      const content = generator.generateTestContent(filePath);

      expect(content).toContain('async ()');
      expect(content).toContain('await fetchData');
    });

    test('generates class tests with methods', () => {
      const filePath = path.join(testDir, 'lib', 'service.js');
      fs.writeFileSync(filePath, `
        class Service {
          process() {}
          async fetch(id) {}
        }
        module.exports = { Service };
      `);

      const content = generator.generateTestContent(filePath);

      expect(content).toContain("describe('Service'");
      expect(content).toContain('beforeEach');
      expect(content).toContain('new Service()');
      expect(content).toContain("describe('process'");
      expect(content).toContain("describe('fetch'");
    });

    test('handles Mocha framework', () => {
      generator.framework = TEST_FRAMEWORKS.MOCHA;

      const filePath = path.join(testDir, 'lib', 'module.js');
      fs.writeFileSync(filePath, `
        function foo() {}
        module.exports = { foo };
      `);

      const content = generator.generateTestContent(filePath);

      expect(content).toContain("require('chai')");
    });
  });

  describe('getTestFilePath', () => {
    test('generates test file path', () => {
      generator.testDir = 'tests';
      generator.sourceDir = 'lib';

      const testPath = generator.getTestFilePath('/project/lib/utils.js');

      expect(testPath).toContain('tests');
      expect(testPath).toContain('utils.test.js');
    });
  });

  describe('generateTestFile', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'lib'), { recursive: true });
    });

    test('generates and writes test file', () => {
      const filePath = path.join(testDir, 'lib', 'module.js');
      fs.writeFileSync(filePath, `
        function foo() {}
        module.exports = { foo };
      `);

      const result = generator.generateTestFile(filePath);

      expect(result.written).toBe(true);
      expect(fs.existsSync(result.path)).toBe(true);
    });

    test('dry run does not write file', () => {
      const filePath = path.join(testDir, 'lib', 'module.js');
      fs.writeFileSync(filePath, `
        function foo() {}
        module.exports = { foo };
      `);

      const result = generator.generateTestFile(filePath, true);

      expect(result.written).toBe(false);
      expect(fs.existsSync(result.path)).toBe(false);
      expect(result.content).toBeDefined();
    });
  });

  describe('generateForDirectory', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'lib', 'sub'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'lib', 'a.js'),
        `function a() {}\nmodule.exports = { a };`,
      );
      fs.writeFileSync(
        path.join(testDir, 'lib', 'sub', 'b.js'),
        `function b() {}\nmodule.exports = { b };`,
      );
    });

    test('generates tests for all files in directory', () => {
      const results = generator.generateForDirectory(path.join(testDir, 'lib'));

      expect(results.length).toBe(2);
      expect(results.every(r => r.written)).toBe(true);
    });

    test('dry run returns content without writing', () => {
      const results = generator.generateForDirectory(path.join(testDir, 'lib'), true);

      expect(results.length).toBe(2);
      expect(results.every(r => !r.written)).toBe(true);
      expect(results.every(r => r.content)).toBe(true);
    });

    test('skips existing test files', () => {
      fs.writeFileSync(
        path.join(testDir, 'lib', 'module.test.js'),
        `// test file`,
      );

      const results = generator.generateForDirectory(path.join(testDir, 'lib'));

      const testFiles = results.filter(r => r.path.includes('module.test'));
      expect(testFiles.length).toBe(0);
    });
  });
});

describe('TEST_FRAMEWORKS', () => {
  test('has expected values', () => {
    expect(TEST_FRAMEWORKS.JEST).toBe('jest');
    expect(TEST_FRAMEWORKS.MOCHA).toBe('mocha');
    expect(TEST_FRAMEWORKS.NODE_TEST).toBe('node:test');
  });
});
