/**
 * Test Generator
 *
 * Automatically generates test stubs based on source code analysis.
 * Detects exported functions, classes, and methods to create
 * comprehensive test scaffolding.
 */

const fs = require('fs');
const path = require('path');

/**
 * Export detection patterns (reserved for future use)
 */
const _EXPORT_PATTERNS = {
  // module.exports = { func1, func2 }
  moduleExportsObject: /module\.exports\s*=\s*\{([^}]+)\}/g,
  // module.exports.name = ...
  moduleExportsProperty: /module\.exports\.(\w+)\s*=/g,
  // module.exports = ClassName
  moduleExportsSingle: /module\.exports\s*=\s*(\w+)/g,
  // exports.name = ...
  exportsProperty: /exports\.(\w+)\s*=/g,
  // export function name() {}
  exportFunction: /export\s+(?:async\s+)?function\s+(\w+)/g,
  // export const/let/var name = ...
  exportConst: /export\s+(?:const|let|var)\s+(\w+)/g,
  // export class Name {}
  exportClass: /export\s+class\s+(\w+)/g,
  // export default ...
  exportDefault: /export\s+default\s+(?:class|function)?\s*(\w+)?/g,
  // export { name1, name2 }
  exportNamed: /export\s*\{([^}]+)\}/g,
};

/**
 * Function/class detection patterns (reserved for future use)
 */
const _DEFINITION_PATTERNS = {
  // function name(params) {}
  functionDecl: /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
  // const name = function(params) {}
  functionExpr: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)/g,
  // const name = (params) => {}
  arrowFunction: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g,
  // class Name {}
  classDecl: /class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{/g,
  // methodName(params) {} inside class
  classMethod: /^\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/gm,
  // static methodName(params) {}
  staticMethod: /^\s*static\s+(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/gm,
};

/**
 * Test frameworks
 */
const TEST_FRAMEWORKS = {
  JEST: 'jest',
  MOCHA: 'mocha',
  NODE_TEST: 'node:test',
};

/**
 * Test Generator class
 */
class TestGenerator {
  constructor(options = {}) {
    this.framework = options.framework || TEST_FRAMEWORKS.JEST;
    this.testDir = options.testDir || 'tests';
    this.sourceDir = options.sourceDir || 'lib';
    this.includeSnapshots = options.includeSnapshots || false;
  }

  /**
   * Analyze a source file and extract testable exports
   * @param {string} filePath - Path to source file
   * @returns {object} Analysis results
   */
  analyzeFile(filePath) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return { error: `Could not read file: ${filePath}` };
    }

    const exports = this.extractExports(content);
    const functions = this.extractFunctions(content);
    const classes = this.extractClasses(content);

    return {
      filePath,
      exports,
      functions,
      classes,
      testable: this.identifyTestable(exports, functions, classes),
    };
  }

  /**
   * Extract exported names from content
   * @param {string} content - File content
   * @returns {string[]}
   */
  extractExports(content) {
    const exports = new Set();

    // module.exports = { a, b, c }
    const objMatch = content.match(/module\.exports\s*=\s*\{([^}]+)\}/);
    if (objMatch) {
      const names = objMatch[1].split(',').map(n => n.trim().split(':')[0].trim());
      names.forEach(n => exports.add(n));
    }

    // module.exports.name = ...
    for (const match of content.matchAll(/module\.exports\.(\w+)\s*=/g)) {
      exports.add(match[1]);
    }

    // module.exports = SingleExport
    const singleMatch = content.match(/module\.exports\s*=\s*(\w+)\s*;?\s*$/m);
    if (singleMatch && !singleMatch[0].includes('{')) {
      exports.add(singleMatch[1]);
    }

    // exports.name = ...
    for (const match of content.matchAll(/exports\.(\w+)\s*=/g)) {
      exports.add(match[1]);
    }

    // export function/class/const
    for (const match of content.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g)) {
      exports.add(match[1]);
    }

    // export { a, b, c }
    for (const match of content.matchAll(/export\s*\{([^}]+)\}/g)) {
      const names = match[1].split(',').map(n => {
        const parts = n.trim().split(/\s+as\s+/);
        return parts[parts.length - 1].trim();
      });
      names.forEach(n => exports.add(n));
    }

    // export default
    const defaultMatch = content.match(/export\s+default\s+(?:class|function)?\s*(\w+)/);
    if (defaultMatch && defaultMatch[1]) {
      exports.add(defaultMatch[1]);
    }

    return Array.from(exports).filter(e => e && e !== 'undefined');
  }

  /**
   * Extract function definitions
   * @param {string} content - File content
   * @returns {Array<{name: string, params: string[], async: boolean}>}
   */
  extractFunctions(content) {
    const functions = [];
    const seen = new Set();

    // Regular function declarations
    for (const match of content.matchAll(/(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g)) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        functions.push({
          name: match[1],
          params: this.parseParams(match[2]),
          async: match[0].includes('async'),
        });
      }
    }

    // Function expressions (with function keyword)
    const funcExprPattern = /(?:const|let|var)\s+(\w+)\s*=\s*(async\s+)?function\s*\(([^)]*)\)/g;
    for (const match of content.matchAll(funcExprPattern)) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        functions.push({
          name: match[1],
          params: this.parseParams(match[3]),
          async: !!match[2],
        });
      }
    }

    // Arrow functions
    const arrowPattern = /(?:const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>/g;
    for (const match of content.matchAll(arrowPattern)) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        functions.push({
          name: match[1],
          params: this.parseParams(match[3]),
          async: !!match[2],
        });
      }
    }

    return functions;
  }

  /**
   * Extract class definitions with methods
   * @param {string} content - File content
   * @returns {Array<{name: string, methods: Array}>}
   */
  extractClasses(content) {
    const classes = [];

    // Find class declarations
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g;
    let classMatch;

    while ((classMatch = classRegex.exec(content)) !== null) {
      const className = classMatch[1];
      const extendsClass = classMatch[2] || null;
      const classStart = classMatch.index + classMatch[0].length;

      // Find matching closing brace
      let braceCount = 1;
      let classEnd = classStart;

      for (let i = classStart; i < content.length && braceCount > 0; i++) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') braceCount--;
        classEnd = i;
      }

      const classBody = content.slice(classStart, classEnd);
      const methods = this.extractMethods(classBody);

      classes.push({
        name: className,
        extends: extendsClass,
        methods,
      });
    }

    return classes;
  }

  /**
   * Extract methods from class body
   * @param {string} classBody - Class body content
   * @returns {Array<{name: string, params: string[], static: boolean, async: boolean}>}
   */
  extractMethods(classBody) {
    const methods = [];
    const seen = new Set();

    // Match method patterns
    const methodRegex = /^\s*(static\s+)?(async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/gm;
    let match;

    while ((match = methodRegex.exec(classBody)) !== null) {
      const name = match[3];

      // Skip constructor and private methods
      if (name === 'constructor' || name.startsWith('_') || name.startsWith('#')) {
        continue;
      }

      if (!seen.has(name)) {
        seen.add(name);
        methods.push({
          name,
          params: this.parseParams(match[4]),
          static: !!match[1],
          async: !!match[2],
        });
      }
    }

    return methods;
  }

  /**
   * Parse parameter string into array
   * @param {string} paramStr - Parameter string
   * @returns {string[]}
   */
  parseParams(paramStr) {
    if (!paramStr || !paramStr.trim()) return [];

    return paramStr
      .split(',')
      .map(p => p.trim())
      .filter(p => p)
      .map(p => {
        // Handle default values and destructuring
        const name = p.split('=')[0].trim();
        return name.replace(/[{}[\]]/g, '').trim();
      })
      .filter(p => p);
  }

  /**
   * Identify testable items from analysis
   * @param {string[]} exports - Exported names
   * @param {Array} functions - Function definitions
   * @param {Array} classes - Class definitions
   * @returns {Array}
   */
  identifyTestable(exports, functions, classes) {
    const testable = [];
    const exportSet = new Set(exports);

    // Add exported functions
    for (const func of functions) {
      if (exportSet.has(func.name)) {
        testable.push({
          type: 'function',
          ...func,
        });
      }
    }

    // Add exported classes
    for (const cls of classes) {
      if (exportSet.has(cls.name)) {
        testable.push({
          type: 'class',
          ...cls,
        });
      }
    }

    return testable;
  }

  /**
   * Generate test file content
   * @param {string} sourcePath - Source file path
   * @param {object} analysis - Analysis results (optional)
   * @returns {string}
   */
  generateTestContent(sourcePath, analysis = null) {
    if (!analysis) {
      analysis = this.analyzeFile(sourcePath);
    }

    if (analysis.error) {
      return `// Error: ${analysis.error}`;
    }

    const relativePath = this.getRelativeImportPath(sourcePath);
    const fileName = path.basename(sourcePath, path.extname(sourcePath));

    const lines = [
      '/**',
      ` * Tests for ${fileName}`,
      ' * Auto-generated test stub',
      ' */',
      '',
    ];

    // Add imports based on framework
    if (this.framework === TEST_FRAMEWORKS.JEST) {
      lines.push(`const {`);
      for (const item of analysis.testable) {
        lines.push(`  ${item.name},`);
      }
      lines.push(`} = require('${relativePath}');`);
      lines.push('');
    } else if (this.framework === TEST_FRAMEWORKS.MOCHA) {
      lines.push(`const { expect } = require('chai');`);
      lines.push(`const {`);
      for (const item of analysis.testable) {
        lines.push(`  ${item.name},`);
      }
      lines.push(`} = require('${relativePath}');`);
      lines.push('');
    } else if (this.framework === TEST_FRAMEWORKS.NODE_TEST) {
      lines.push(`const { describe, it } = require('node:test');`);
      lines.push(`const assert = require('node:assert');`);
      lines.push(`const {`);
      for (const item of analysis.testable) {
        lines.push(`  ${item.name},`);
      }
      lines.push(`} = require('${relativePath}');`);
      lines.push('');
    }

    // Generate test blocks
    for (const item of analysis.testable) {
      if (item.type === 'function') {
        lines.push(...this.generateFunctionTests(item));
      } else if (item.type === 'class') {
        lines.push(...this.generateClassTests(item));
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate tests for a function
   * @param {object} func - Function definition
   * @returns {string[]}
   */
  generateFunctionTests(func) {
    const lines = [
      `describe('${func.name}', () => {`,
    ];

    if (func.async) {
      lines.push(`  test('should handle async operation', async () => {`);
      if (func.params.length > 0) {
        lines.push(`    // TODO: Provide test arguments`);
        lines.push(`    const result = await ${func.name}(/* ${func.params.join(', ')} */);`);
      } else {
        lines.push(`    const result = await ${func.name}();`);
      }
      lines.push(`    expect(result).toBeDefined();`);
      lines.push(`  });`);
    } else {
      lines.push(`  test('should return expected result', () => {`);
      if (func.params.length > 0) {
        lines.push(`    // TODO: Provide test arguments`);
        lines.push(`    const result = ${func.name}(/* ${func.params.join(', ')} */);`);
      } else {
        lines.push(`    const result = ${func.name}();`);
      }
      lines.push(`    expect(result).toBeDefined();`);
      lines.push(`  });`);
    }

    // Add edge case stubs
    lines.push('');
    lines.push(`  test('should handle edge cases', () => {`);
    lines.push(`    // TODO: Add edge case tests`);
    lines.push(`  });`);

    if (func.params.length > 0) {
      lines.push('');
      lines.push(`  test('should handle invalid input', () => {`);
      lines.push(`    // TODO: Test with invalid/missing parameters`);
      lines.push(`  });`);
    }

    lines.push(`});`);
    lines.push('');

    return lines;
  }

  /**
   * Generate tests for a class
   * @param {object} cls - Class definition
   * @returns {string[]}
   */
  generateClassTests(cls) {
    const lines = [
      `describe('${cls.name}', () => {`,
      `  let instance;`,
      '',
      `  beforeEach(() => {`,
      `    instance = new ${cls.name}();`,
      `  });`,
      '',
      `  describe('constructor', () => {`,
      `    test('should create instance', () => {`,
      `      expect(instance).toBeInstanceOf(${cls.name});`,
      `    });`,
      `  });`,
    ];

    // Add method tests
    for (const method of cls.methods) {
      lines.push('');
      lines.push(...this.generateMethodTests(method, cls.name));
    }

    lines.push(`});`);
    lines.push('');

    return lines;
  }

  /**
   * Generate tests for a class method
   * @param {object} method - Method definition
   * @param {string} className - Class name
   * @returns {string[]}
   */
  generateMethodTests(method, className) {
    const target = method.static ? className : 'instance';
    const lines = [
      `  describe('${method.name}', () => {`,
    ];

    if (method.async) {
      lines.push(`    test('should handle async operation', async () => {`);
      if (method.params.length > 0) {
        lines.push(`      // TODO: Provide test arguments`);
        lines.push(`      const result = await ${target}.${method.name}(/* ${method.params.join(', ')} */);`);
      } else {
        lines.push(`      const result = await ${target}.${method.name}();`);
      }
      lines.push(`      expect(result).toBeDefined();`);
      lines.push(`    });`);
    } else {
      lines.push(`    test('should return expected result', () => {`);
      if (method.params.length > 0) {
        lines.push(`      // TODO: Provide test arguments`);
        lines.push(`      const result = ${target}.${method.name}(/* ${method.params.join(', ')} */);`);
      } else {
        lines.push(`      const result = ${target}.${method.name}();`);
      }
      lines.push(`      expect(result).toBeDefined();`);
      lines.push(`    });`);
    }

    lines.push(`  });`);

    return lines;
  }

  /**
   * Get relative import path for test file
   * @param {string} sourcePath - Source file path
   * @returns {string}
   */
  getRelativeImportPath(sourcePath) {
    const testPath = this.getTestFilePath(sourcePath);
    const testDir = path.dirname(testPath);

    let relative = path.relative(testDir, sourcePath);
    if (!relative.startsWith('.')) {
      relative = `./${ relative}`;
    }

    // Remove extension for require
    return relative.replace(/\.[^.]+$/, '');
  }

  /**
   * Get test file path for a source file
   * @param {string} sourcePath - Source file path
   * @returns {string}
   */
  getTestFilePath(sourcePath) {
    const ext = path.extname(sourcePath);
    const baseName = path.basename(sourcePath, ext);
    const sourceDir = path.dirname(sourcePath);

    // Determine test directory structure
    const relativeSrc = sourceDir.replace(this.sourceDir, '').replace(/^[/\\]/, '');

    return path.join(this.testDir, relativeSrc, `${baseName}.test${ext || '.js'}`);
  }

  /**
   * Generate test file for a source file
   * @param {string} sourcePath - Source file path
   * @param {boolean} dryRun - If true, don't write file
   * @returns {{path: string, content: string, written: boolean}}
   */
  generateTestFile(sourcePath, dryRun = false) {
    const analysis = this.analyzeFile(sourcePath);
    const content = this.generateTestContent(sourcePath, analysis);
    const testPath = this.getTestFilePath(sourcePath);

    const result = {
      path: testPath,
      content,
      written: false,
      analysis,
    };

    if (!dryRun) {
      const testDir = path.dirname(testPath);
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      fs.writeFileSync(testPath, content);
      result.written = true;
    }

    return result;
  }

  /**
   * Generate tests for all files in a directory
   * @param {string} dir - Directory to scan
   * @param {boolean} dryRun - If true, don't write files
   * @returns {Array}
   */
  generateForDirectory(dir, dryRun = false) {
    const results = [];
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs'];

    const scan = (scanDir) => {
      let entries;
      try {
        entries = fs.readdirSync(scanDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(scanDir, entry.name);

        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'test', 'tests', '__tests__'].includes(entry.name)) {
            scan(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
            const result = this.generateTestFile(fullPath, dryRun);
            results.push(result);
          }
        }
      }
    };

    scan(dir);
    return results;
  }
}

module.exports = {
  TestGenerator,
  TEST_FRAMEWORKS,
};
