/**
 * Documentation Generator Tests
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  DocGenerator,
  DOC_TYPES,
} = require('../../lib/automation');

describe('DocGenerator', () => {
  let generator;
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-gen-test-'));
    generator = new DocGenerator({
      outputDir: path.join(testDir, 'docs'),
      sourceDir: path.join(testDir, 'lib'),
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    test('uses default options', () => {
      const defaultGen = new DocGenerator();
      expect(defaultGen.outputDir).toBe('docs');
      expect(defaultGen.format).toBe('markdown');
    });

    test('accepts custom options', () => {
      const custom = new DocGenerator({
        outputDir: 'api-docs',
        includePrivate: true,
      });
      expect(custom.outputDir).toBe('api-docs');
      expect(custom.includePrivate).toBe(true);
    });
  });

  describe('parseJSDoc', () => {
    test('parses function documentation', () => {
      const content = `
        /**
         * Adds two numbers
         * @param {number} a - First number
         * @param {number} b - Second number
         * @returns {number} The sum
         */
        function add(a, b) {}
      `;

      const docs = generator.parseJSDoc(content);

      expect(docs.length).toBe(1);
      expect(docs[0].description).toBe('Adds two numbers');
      expect(docs[0].params.length).toBe(2);
      expect(docs[0].returns.type).toBe('number');
    });

    test('parses class documentation', () => {
      const content = `
        /**
         * User service class
         * @class
         */
        class UserService {}
      `;

      const docs = generator.parseJSDoc(content);

      expect(docs.length).toBe(1);
      expect(docs[0].type).toBe(DOC_TYPES.CLASS);
      expect(docs[0].name).toBe('UserService');
    });

    test('parses module documentation', () => {
      const content = `
        /**
         * Utility functions
         * @module utils
         */
      `;

      const docs = generator.parseJSDoc(content);

      expect(docs.length).toBe(1);
      expect(docs[0].module).toBe('utils');
    });

    test('skips private docs by default', () => {
      const content = `
        /**
         * Public function
         */
        function publicFn() {}

        /**
         * Private function
         * @private
         */
        function privateFn() {}
      `;

      const docs = generator.parseJSDoc(content);

      expect(docs.length).toBe(1);
      expect(docs[0].name).toBe('publicFn');
    });

    test('includes private when configured', () => {
      generator.includePrivate = true;

      const content = `
        /**
         * Private function
         * @private
         */
        function privateFn() {}
      `;

      const docs = generator.parseJSDoc(content);

      expect(docs.length).toBe(1);
    });
  });

  describe('parseCommentBlock', () => {
    test('extracts description', () => {
      const body = 'This is the description.\n@param {string} x';
      const doc = generator.parseCommentBlock(body);

      expect(doc.description).toBe('This is the description.');
    });

    test('extracts multiple params', () => {
      const body = `
        @param {string} name - The name
        @param {number} age - The age
        @param {boolean} [active] - Optional flag
      `;
      const doc = generator.parseCommentBlock(body);

      expect(doc.params.length).toBe(3);
      expect(doc.params[0].type).toBe('string');
      expect(doc.params[0].name).toBe('name');
      expect(doc.params[2].optional).toBe(true);
    });

    test('extracts returns', () => {
      const body = '@returns {Promise<User>} The user object';
      const doc = generator.parseCommentBlock(body);

      expect(doc.returns.type).toBe('Promise<User>');
      expect(doc.returns.description).toBe('The user object');
    });

    test('extracts examples', () => {
      const body = `
        @example
        const result = foo();
        console.log(result);
        @example
        foo(1, 2);
      `;
      const doc = generator.parseCommentBlock(body);

      expect(doc.examples.length).toBe(2);
    });

    test('extracts throws', () => {
      const body = `
        @throws {Error} When input is invalid
        @throws {TypeError} When type mismatch
      `;
      const doc = generator.parseCommentBlock(body);

      expect(doc.throws.length).toBe(2);
      expect(doc.throws[0].type).toBe('Error');
    });

    test('extracts properties', () => {
      const body = `
        @property {string} name - User name
        @property {number} age - User age
      `;
      const doc = generator.parseCommentBlock(body);

      expect(doc.properties.length).toBe(2);
      expect(doc.properties[0].name).toBe('name');
    });

    test('extracts deprecated', () => {
      const body = '@deprecated Use newFunction instead';
      const doc = generator.parseCommentBlock(body);

      expect(doc.deprecated).toBe('Use newFunction instead');
    });

    test('extracts since', () => {
      const body = '@since 2.0.0';
      const doc = generator.parseCommentBlock(body);

      expect(doc.since).toBe('2.0.0');
    });

    test('extracts see references', () => {
      const body = `
        @see OtherClass
        @see {@link https://example.com}
      `;
      const doc = generator.parseCommentBlock(body);

      expect(doc.see.length).toBe(2);
    });

    test('extracts typedef', () => {
      const body = '@typedef {Object} User';
      const doc = generator.parseCommentBlock(body);

      expect(doc.typedef.type).toBe('Object');
      expect(doc.typedef.name).toBe('User');
    });

    test('extracts boolean flags', () => {
      const body = '@private\n@static\n@async';
      const doc = generator.parseCommentBlock(body);

      expect(doc.private).toBe(true);
      expect(doc.static).toBe(true);
      expect(doc.async).toBe(true);
    });
  });

  describe('generateMarkdown', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'lib'), { recursive: true });
    });

    test('generates markdown for file', () => {
      const filePath = path.join(testDir, 'lib', 'utils.js');
      fs.writeFileSync(filePath, `
        /**
         * Utility module
         * @module utils
         */

        /**
         * Adds numbers
         * @param {number} a - First
         * @param {number} b - Second
         * @returns {number} Sum
         */
        function add(a, b) { return a + b; }

        module.exports = { add };
      `);

      const md = generator.generateMarkdown(filePath);

      expect(md).toContain('# utils');
      expect(md).toContain('## Functions');
      expect(md).toContain('### add');
      expect(md).toContain('**Parameters:**');
      expect(md).toContain('**Returns:**');
    });

    test('includes deprecation warnings', () => {
      const filePath = path.join(testDir, 'lib', 'old.js');
      fs.writeFileSync(filePath, `
        /**
         * Old function
         * @deprecated Use newFn instead
         */
        function oldFn() {}

        module.exports = { oldFn };
      `);

      const md = generator.generateMarkdown(filePath);

      expect(md).toContain('**Deprecated**');
    });

    test('includes examples', () => {
      const filePath = path.join(testDir, 'lib', 'example.js');
      fs.writeFileSync(filePath, `
        /**
         * Example function
         * @example
         * const result = exampleFn();
         */
        function exampleFn() {}

        module.exports = { exampleFn };
      `);

      const md = generator.generateMarkdown(filePath);

      expect(md).toContain('**Example:**');
      expect(md).toContain('```javascript');
    });

    test('documents classes', () => {
      const filePath = path.join(testDir, 'lib', 'service.js');
      fs.writeFileSync(filePath, `
        /**
         * Service class
         * @class
         * @property {string} name - Service name
         */
        class Service {}

        module.exports = { Service };
      `);

      const md = generator.generateMarkdown(filePath);

      expect(md).toContain('## Classes');
      expect(md).toContain('### class Service');
      expect(md).toContain('**Properties:**');
    });

    test('documents typedefs', () => {
      const filePath = path.join(testDir, 'lib', 'types.js');
      fs.writeFileSync(filePath, `
        /**
         * User object
         * @typedef {Object} User
         * @property {string} name - User name
         * @property {number} age - User age
         */
      `);

      const md = generator.generateMarkdown(filePath);

      expect(md).toContain('## Type Definitions');
      expect(md).toContain('### User');
    });
  });

  describe('formatFunction', () => {
    test('formats function with params and returns', () => {
      const doc = {
        name: 'add',
        description: 'Adds numbers',
        params: [
          { name: 'a', type: 'number', description: 'First', optional: false },
          { name: 'b', type: 'number', description: 'Second', optional: true },
        ],
        returns: { type: 'number', description: 'Sum' },
        examples: [],
        throws: [],
        see: [],
        async: false,
      };

      const lines = generator.formatFunction(doc);
      const md = lines.join('\n');

      expect(md).toContain('### add(a, b)');
      expect(md).toContain('| a | `number` |');
      expect(md).toContain('*(optional)*');
      expect(md).toContain('**Returns:** `number`');
    });

    test('formats async function', () => {
      const doc = {
        name: 'fetch',
        description: 'Fetches data',
        params: [],
        returns: null,
        examples: [],
        throws: [],
        see: [],
        async: true,
      };

      const lines = generator.formatFunction(doc);
      const md = lines.join('\n');

      expect(md).toContain('### async fetch()');
    });
  });

  describe('generateDocFile', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'lib'), { recursive: true });
    });

    test('generates and writes doc file', () => {
      const filePath = path.join(testDir, 'lib', 'module.js');
      fs.writeFileSync(filePath, `
        /**
         * Test function
         */
        function test() {}
        module.exports = { test };
      `);

      const result = generator.generateDocFile(filePath);

      expect(result.written).toBe(true);
      expect(fs.existsSync(result.path)).toBe(true);
    });

    test('dry run does not write file', () => {
      const filePath = path.join(testDir, 'lib', 'module.js');
      fs.writeFileSync(filePath, `
        /**
         * Test function
         */
        function test() {}
        module.exports = { test };
      `);

      const result = generator.generateDocFile(filePath, true);

      expect(result.written).toBe(false);
      expect(fs.existsSync(result.path)).toBe(false);
    });
  });

  describe('generateForDirectory', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'lib', 'sub'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'lib', 'a.js'),
        `/** @module a */\nfunction a() {}`,
      );
      fs.writeFileSync(
        path.join(testDir, 'lib', 'sub', 'b.js'),
        `/** @module b */\nfunction b() {}`,
      );
    });

    test('generates docs for all files', () => {
      const results = generator.generateForDirectory(path.join(testDir, 'lib'));

      expect(results.length).toBe(2);
      expect(results.every(r => r.written)).toBe(true);
    });

    test('dry run returns content without writing', () => {
      const results = generator.generateForDirectory(path.join(testDir, 'lib'), true);

      expect(results.length).toBe(2);
      expect(results.every(r => !r.written)).toBe(true);
    });
  });

  describe('generateApiIndex', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'lib', 'utils'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'lib', 'main.js'),
        `/** @module main */`,
      );
      fs.writeFileSync(
        path.join(testDir, 'lib', 'utils', 'helpers.js'),
        `/** @module helpers */`,
      );
    });

    test('generates API index', () => {
      const index = generator.generateApiIndex(path.join(testDir, 'lib'));

      expect(index).toContain('# API Reference');
      expect(index).toContain('## Modules');
      expect(index).toContain('main');
      expect(index).toContain('helpers');
    });
  });

  describe('generateAll', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(testDir, 'lib'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'lib', 'module.js'),
        `/** @module module */\nfunction foo() {}`,
      );
    });

    test('generates all docs and index', () => {
      const results = generator.generateAll(path.join(testDir, 'lib'));

      expect(results.modules.length).toBe(1);
      expect(results.index.written).toBe(true);
      expect(fs.existsSync(results.index.path)).toBe(true);
    });

    test('dry run generates content only', () => {
      const results = generator.generateAll(path.join(testDir, 'lib'), true);

      expect(results.modules.every(r => !r.written)).toBe(true);
      expect(results.index.written).toBe(false);
    });
  });

  describe('getDocFilePath', () => {
    test('generates correct path', () => {
      generator.outputDir = 'docs';
      generator.sourceDir = 'lib';

      const docPath = generator.getDocFilePath('/project/lib/utils.js');

      expect(docPath).toContain('docs');
      expect(docPath).toContain('utils.md');
    });
  });
});

describe('DOC_TYPES', () => {
  test('has expected values', () => {
    expect(DOC_TYPES.MODULE).toBe('module');
    expect(DOC_TYPES.CLASS).toBe('class');
    expect(DOC_TYPES.FUNCTION).toBe('function');
    expect(DOC_TYPES.METHOD).toBe('method');
    expect(DOC_TYPES.PROPERTY).toBe('property');
    expect(DOC_TYPES.CONSTANT).toBe('constant');
    expect(DOC_TYPES.TYPEDEF).toBe('typedef');
  });
});
