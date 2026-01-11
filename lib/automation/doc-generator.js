/**
 * Documentation Generator
 *
 * Automatically generates documentation from source code:
 * - JSDoc comments extraction
 * - API documentation
 * - Module documentation
 * - README generation
 */

const fs = require('fs');
const path = require('path');

/**
 * JSDoc tag patterns (reserved for future use)
 */
const _JSDOC_PATTERNS = {
  block: /\/\*\*\s*([\s\S]*?)\s*\*\//g,
  param: /@param\s+\{([^}]+)\}\s+(\w+)(?:\s*-\s*(.+))?/g,
  returns: /@returns?\s+\{([^}]+)\}(?:\s*-?\s*(.+))?/,
  description: /^([^@]+)/,
  example: /@example\s*([\s\S]*?)(?=@|$)/g,
  throws: /@throws?\s+\{([^}]+)\}(?:\s*-?\s*(.+))?/g,
  deprecated: /@deprecated(?:\s+(.+))?/,
  since: /@since\s+(.+)/,
  see: /@see\s+(.+)/g,
  type: /@type\s+\{([^}]+)\}/,
  typedef: /@typedef\s+\{([^}]+)\}\s+(\w+)/,
  property: /@property\s+\{([^}]+)\}\s+(\w+)(?:\s*-\s*(.+))?/g,
  private: /@private/,
  public: /@public/,
  static: /@static/,
  async: /@async/,
  class: /@class(?:\s+(\w+))?/,
  constructor: /@constructor/,
  module: /@module\s+(\w+)/,
  memberof: /@memberof\s+(\w+)/,
};

/**
 * Documentation types
 */
const DOC_TYPES = {
  MODULE: 'module',
  CLASS: 'class',
  FUNCTION: 'function',
  METHOD: 'method',
  PROPERTY: 'property',
  CONSTANT: 'constant',
  TYPEDEF: 'typedef',
};

/**
 * Documentation Generator class
 */
class DocGenerator {
  constructor(options = {}) {
    this.outputDir = options.outputDir || 'docs';
    this.sourceDir = options.sourceDir || 'lib';
    this.includePrivate = options.includePrivate || false;
    this.format = options.format || 'markdown';
  }

  /**
   * Parse JSDoc comments from file content
   * @param {string} content - File content
   * @returns {Array<object>}
   */
  parseJSDoc(content) {
    const docs = [];
    // Match JSDoc blocks followed by declarations
    const blockPattern = '\\/\\*\\*\\s*([\\s\\S]*?)\\s*\\*\\/\\s*\\n?\\s*' +
      '(?:export\\s+)?(?:async\\s+)?(?:(const|let|var|function|class)\\s+)?(\\w+)?';
    const blockRegex = new RegExp(blockPattern, 'g');

    let match;
    while ((match = blockRegex.exec(content)) !== null) {
      const commentBody = match[1];
      const declType = match[2];
      const name = match[3];

      const doc = this.parseCommentBlock(commentBody);
      doc.name = name || doc.name;
      doc.declarationType = declType;

      // Determine doc type
      if (doc.class || declType === 'class') {
        doc.type = DOC_TYPES.CLASS;
      } else if (doc.typedef) {
        doc.type = DOC_TYPES.TYPEDEF;
      } else if (declType === 'function' || doc.params.length > 0 || doc.returns) {
        doc.type = DOC_TYPES.FUNCTION;
      } else if (doc.module) {
        doc.type = DOC_TYPES.MODULE;
      } else {
        doc.type = DOC_TYPES.CONSTANT;
      }

      // Skip private unless configured
      if (doc.private && !this.includePrivate) {
        continue;
      }

      docs.push(doc);
    }

    return docs;
  }

  /**
   * Parse a single JSDoc comment block
   * @param {string} body - Comment body
   * @returns {object}
   */
  parseCommentBlock(body) {
    const lines = body
      .split('\n')
      .map(line => line.replace(/^\s*\*\s?/, '').trim())
      .join('\n');

    const doc = {
      description: '',
      params: [],
      returns: null,
      examples: [],
      throws: [],
      deprecated: null,
      since: null,
      see: [],
      private: false,
      static: false,
      async: false,
      properties: [],
    };

    // Extract description (text before first @tag)
    const descMatch = lines.match(/^([^@]+)/);
    if (descMatch) {
      doc.description = descMatch[1].trim();
    }

    // Extract @param tags
    const paramRegex = /@param\s+\{([^}]+)\}\s+(\[?\w+\]?)(?:\s*-?\s*(.+))?/g;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(lines)) !== null) {
      const paramName = paramMatch[2];
      const optional = paramName.startsWith('[') && paramName.endsWith(']');
      doc.params.push({
        type: paramMatch[1],
        name: paramName.replace(/[\[\]]/g, ''),
        description: paramMatch[3] || '',
        optional,
      });
    }

    // Extract @returns
    const returnsMatch = lines.match(/@returns?\s+\{([^}]+)\}(?:\s*-?\s*(.+))?/);
    if (returnsMatch) {
      doc.returns = {
        type: returnsMatch[1],
        description: returnsMatch[2] || '',
      };
    }

    // Extract @example
    const exampleRegex = /@example\s*([\s\S]*?)(?=@\w|$)/g;
    let exampleMatch;
    while ((exampleMatch = exampleRegex.exec(lines)) !== null) {
      const example = exampleMatch[1].trim();
      if (example) {
        doc.examples.push(example);
      }
    }

    // Extract @throws
    const throwsRegex = /@throws?\s+\{([^}]+)\}(?:\s*-?\s*(.+))?/g;
    let throwsMatch;
    while ((throwsMatch = throwsRegex.exec(lines)) !== null) {
      doc.throws.push({
        type: throwsMatch[1],
        description: throwsMatch[2] || '',
      });
    }

    // Extract @property
    const propRegex = /@property\s+\{([^}]+)\}\s+(\w+)(?:\s*-?\s*(.+))?/g;
    let propMatch;
    while ((propMatch = propRegex.exec(lines)) !== null) {
      doc.properties.push({
        type: propMatch[1],
        name: propMatch[2],
        description: propMatch[3] || '',
      });
    }

    // Extract simple tags
    const deprecatedMatch = lines.match(/@deprecated(?:\s+(.+))?/);
    if (deprecatedMatch) {
      doc.deprecated = deprecatedMatch[1] || true;
    }

    const sinceMatch = lines.match(/@since\s+(.+)/);
    if (sinceMatch) {
      doc.since = sinceMatch[1].trim();
    }

    const seeRegex = /@see\s+(.+)/g;
    let seeMatch;
    while ((seeMatch = seeRegex.exec(lines)) !== null) {
      doc.see.push(seeMatch[1].trim());
    }

    const moduleMatch = lines.match(/@module\s+(\w+)/);
    if (moduleMatch) {
      doc.module = moduleMatch[1];
    }

    const classMatch = lines.match(/@class(?:\s+(\w+))?/);
    if (classMatch) {
      doc.class = classMatch[1] || true;
    }

    const typedefMatch = lines.match(/@typedef\s+\{([^}]+)\}\s+(\w+)/);
    if (typedefMatch) {
      doc.typedef = {
        type: typedefMatch[1],
        name: typedefMatch[2],
      };
    }

    // Boolean flags
    doc.private = /@private/.test(lines);
    doc.static = /@static/.test(lines);
    doc.async = /@async/.test(lines);

    return doc;
  }

  /**
   * Generate markdown documentation for a file
   * @param {string} filePath - Source file path
   * @returns {string}
   */
  generateMarkdown(filePath) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return `# Error\n\nCould not read file: ${filePath}`;
    }

    const docs = this.parseJSDoc(content);
    const fileName = path.basename(filePath);
    const moduleName = path.basename(filePath, path.extname(filePath));

    const lines = [
      `# ${moduleName}`,
      '',
      `Source: \`${fileName}\``,
      '',
    ];

    // Find module-level description
    const moduleDoc = docs.find(d => d.type === DOC_TYPES.MODULE);
    if (moduleDoc) {
      lines.push(moduleDoc.description, '');
    }

    // Group by type
    const classes = docs.filter(d => d.type === DOC_TYPES.CLASS);
    const functions = docs.filter(d => d.type === DOC_TYPES.FUNCTION);
    const constants = docs.filter(d => d.type === DOC_TYPES.CONSTANT);
    const typedefs = docs.filter(d => d.type === DOC_TYPES.TYPEDEF);

    // Document typedefs
    if (typedefs.length > 0) {
      lines.push('## Type Definitions', '');
      for (const typedef of typedefs) {
        lines.push(...this.formatTypedef(typedef));
      }
    }

    // Document classes
    if (classes.length > 0) {
      lines.push('## Classes', '');
      for (const cls of classes) {
        lines.push(...this.formatClass(cls, docs));
      }
    }

    // Document functions
    if (functions.length > 0) {
      lines.push('## Functions', '');
      for (const func of functions) {
        lines.push(...this.formatFunction(func));
      }
    }

    // Document constants
    if (constants.length > 0) {
      lines.push('## Constants', '');
      for (const constant of constants) {
        lines.push(...this.formatConstant(constant));
      }
    }

    return lines.join('\n');
  }

  /**
   * Format a function for markdown
   * @param {object} doc - Function documentation
   * @returns {string[]}
   */
  formatFunction(doc) {
    const lines = [];
    const asyncPrefix = doc.async ? 'async ' : '';
    const params = doc.params.map(p => p.name).join(', ');

    lines.push(`### ${asyncPrefix}${doc.name}(${params})`, '');

    if (doc.deprecated) {
      lines.push(`> **Deprecated**: ${doc.deprecated === true ? 'This function is deprecated.' : doc.deprecated}`, '');
    }

    if (doc.description) {
      lines.push(doc.description, '');
    }

    if (doc.params.length > 0) {
      lines.push('**Parameters:**', '');
      lines.push('| Name | Type | Description |');
      lines.push('|------|------|-------------|');
      for (const param of doc.params) {
        const optional = param.optional ? ' *(optional)*' : '';
        lines.push(`| ${param.name}${optional} | \`${param.type}\` | ${param.description} |`);
      }
      lines.push('');
    }

    if (doc.returns) {
      lines.push(`**Returns:** \`${doc.returns.type}\`${doc.returns.description ? ` - ${doc.returns.description}` : ''}`, '');
    }

    if (doc.throws.length > 0) {
      lines.push('**Throws:**', '');
      for (const t of doc.throws) {
        lines.push(`- \`${t.type}\` - ${t.description}`);
      }
      lines.push('');
    }

    if (doc.examples.length > 0) {
      lines.push('**Example:**', '');
      for (const example of doc.examples) {
        lines.push('```javascript', example, '```', '');
      }
    }

    if (doc.since) {
      lines.push(`*Since: ${doc.since}*`, '');
    }

    if (doc.see.length > 0) {
      lines.push('**See also:**', '');
      for (const see of doc.see) {
        lines.push(`- ${see}`);
      }
      lines.push('');
    }

    lines.push('---', '');

    return lines;
  }

  /**
   * Format a class for markdown
   * @param {object} doc - Class documentation
   * @param {Array} allDocs - All documentation items
   * @returns {string[]}
   */
  formatClass(doc, allDocs) {
    const lines = [];

    lines.push(`### class ${doc.name}`, '');

    if (doc.deprecated) {
      lines.push(`> **Deprecated**: ${doc.deprecated === true ? 'This class is deprecated.' : doc.deprecated}`, '');
    }

    if (doc.description) {
      lines.push(doc.description, '');
    }

    // Find methods belonging to this class (reserved for future method documentation)
    const _methods = allDocs.filter(d =>
      d.memberof === doc.name ||
      (d.type === DOC_TYPES.FUNCTION && d.name && d.name !== doc.name),
    );

    if (doc.properties.length > 0) {
      lines.push('**Properties:**', '');
      lines.push('| Name | Type | Description |');
      lines.push('|------|------|-------------|');
      for (const prop of doc.properties) {
        lines.push(`| ${prop.name} | \`${prop.type}\` | ${prop.description} |`);
      }
      lines.push('');
    }

    if (doc.examples.length > 0) {
      lines.push('**Example:**', '');
      for (const example of doc.examples) {
        lines.push('```javascript', example, '```', '');
      }
    }

    lines.push('---', '');

    return lines;
  }

  /**
   * Format a constant for markdown
   * @param {object} doc - Constant documentation
   * @returns {string[]}
   */
  formatConstant(doc) {
    const lines = [];

    lines.push(`### ${doc.name}`, '');

    if (doc.description) {
      lines.push(doc.description, '');
    }

    if (doc.properties.length > 0) {
      lines.push('**Properties:**', '');
      lines.push('| Name | Type | Description |');
      lines.push('|------|------|-------------|');
      for (const prop of doc.properties) {
        lines.push(`| ${prop.name} | \`${prop.type}\` | ${prop.description} |`);
      }
      lines.push('');
    }

    lines.push('---', '');

    return lines;
  }

  /**
   * Format a typedef for markdown
   * @param {object} doc - Typedef documentation
   * @returns {string[]}
   */
  formatTypedef(doc) {
    const lines = [];
    const name = doc.typedef?.name || doc.name;
    const type = doc.typedef?.type || 'object';

    lines.push(`### ${name}`, '');
    lines.push(`Type: \`${type}\``, '');

    if (doc.description) {
      lines.push(doc.description, '');
    }

    if (doc.properties.length > 0) {
      lines.push('**Properties:**', '');
      lines.push('| Name | Type | Description |');
      lines.push('|------|------|-------------|');
      for (const prop of doc.properties) {
        lines.push(`| ${prop.name} | \`${prop.type}\` | ${prop.description} |`);
      }
      lines.push('');
    }

    lines.push('---', '');

    return lines;
  }

  /**
   * Generate documentation for a directory
   * @param {string} dir - Directory to document
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
          if (!['node_modules', '.git', 'test', 'tests', '__tests__', 'docs'].includes(entry.name)) {
            scan(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            const result = this.generateDocFile(fullPath, dryRun);
            results.push(result);
          }
        }
      }
    };

    scan(dir);
    return results;
  }

  /**
   * Generate documentation file for a source file
   * @param {string} sourcePath - Source file path
   * @param {boolean} dryRun - If true, don't write file
   * @returns {object}
   */
  generateDocFile(sourcePath, dryRun = false) {
    const content = this.generateMarkdown(sourcePath);
    const docPath = this.getDocFilePath(sourcePath);

    const result = {
      source: sourcePath,
      path: docPath,
      content,
      written: false,
    };

    if (!dryRun) {
      const docDir = path.dirname(docPath);
      if (!fs.existsSync(docDir)) {
        fs.mkdirSync(docDir, { recursive: true });
      }
      fs.writeFileSync(docPath, content);
      result.written = true;
    }

    return result;
  }

  /**
   * Get documentation file path for a source file
   * @param {string} sourcePath - Source file path
   * @returns {string}
   */
  getDocFilePath(sourcePath) {
    const baseName = path.basename(sourcePath, path.extname(sourcePath));
    const sourceDir = path.dirname(sourcePath);
    const relativeSrc = sourceDir.replace(this.sourceDir, '').replace(/^[/\\]/, '');

    return path.join(this.outputDir, relativeSrc, `${baseName}.md`);
  }

  /**
   * Generate API index file
   * @param {string} dir - Directory to index
   * @returns {string}
   */
  generateApiIndex(dir) {
    const results = this.generateForDirectory(dir, true);
    const lines = [
      '# API Reference',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Modules',
      '',
    ];

    // Group by directory
    const byDir = new Map();
    for (const result of results) {
      const relPath = path.relative(dir, result.source);
      const dirName = path.dirname(relPath) || 'root';

      if (!byDir.has(dirName)) {
        byDir.set(dirName, []);
      }
      byDir.get(dirName).push({
        name: path.basename(result.source, path.extname(result.source)),
        path: result.path,
      });
    }

    for (const [dirName, files] of byDir) {
      lines.push(`### ${dirName}`, '');
      for (const file of files) {
        const relDocPath = path.relative(this.outputDir, file.path);
        lines.push(`- [${file.name}](${relDocPath})`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate full documentation
   * @param {string} dir - Source directory
   * @param {boolean} dryRun - If true, don't write files
   * @returns {object}
   */
  generateAll(dir, dryRun = false) {
    const moduleResults = this.generateForDirectory(dir, dryRun);
    const indexContent = this.generateApiIndex(dir);

    const results = {
      modules: moduleResults,
      index: {
        path: path.join(this.outputDir, 'API.md'),
        content: indexContent,
        written: false,
      },
    };

    if (!dryRun) {
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }
      fs.writeFileSync(results.index.path, indexContent);
      results.index.written = true;
    }

    return results;
  }
}

module.exports = {
  DocGenerator,
  DOC_TYPES,
};
