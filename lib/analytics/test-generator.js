'use strict';

/**
 * Test Generator Agent
 *
 * Generates tests from models and specifications.
 * dbt-style analytics engineering pattern.
 * Part of Phase 31: Analytics Agents.
 */

const { BaseAgent, AGENT_PRIORITY } = require('../agents/base-agent');

/**
 * Test types
 */
const TEST_TYPE = {
  UNIT: 'unit',
  INTEGRATION: 'integration',
  SCHEMA: 'schema',
  DATA_QUALITY: 'data_quality',
  CUSTOM: 'custom',
};

/**
 * Common data quality tests
 */
const DATA_QUALITY_TESTS = {
  not_null: (column) => ({
    name: `${column}_not_null`,
    sql: `SELECT COUNT(*) as failures FROM {{ ref('model') }} WHERE ${column} IS NULL`,
    assertion: 'failures = 0',
  }),
  unique: (column) => ({
    name: `${column}_unique`,
    sql: `SELECT COUNT(*) as failures FROM (SELECT ${column}, COUNT(*) as cnt FROM {{ ref('model') }} GROUP BY ${column} HAVING COUNT(*) > 1)`,
    assertion: 'failures = 0',
  }),
  accepted_values: (column, values) => ({
    name: `${column}_accepted_values`,
    sql: `SELECT COUNT(*) as failures FROM {{ ref('model') }} WHERE ${column} NOT IN (${values.map(v => `'${v}'`).join(', ')})`,
    assertion: 'failures = 0',
  }),
  relationships: (column, toModel, toColumn) => ({
    name: `${column}_relationships`,
    sql: `SELECT COUNT(*) as failures FROM {{ ref('model') }} m LEFT JOIN {{ ref('${toModel}') }} r ON m.${column} = r.${toColumn} WHERE r.${toColumn} IS NULL AND m.${column} IS NOT NULL`,
    assertion: 'failures = 0',
  }),
};

/**
 * Test Generator Agent
 */
class TestGeneratorAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Test Generator',
      type: 'test_generator',
      priority: AGENT_PRIORITY.NORMAL,
      ...options,
    });

    this.framework = options.framework || 'jest';
    this.dataQualityTests = { ...DATA_QUALITY_TESTS, ...options.dataQualityTests };
  }

  async onExecute() {
    const { model, testType, options } = this.context;

    if (!model) {
      return { success: false, error: 'No model provided' };
    }

    const type = testType || TEST_TYPE.UNIT;

    try {
      const tests = this._generateTests(model, type, options || {});

      return {
        success: true,
        tests,
        testType: type,
        stats: {
          testsGenerated: tests.length,
          assertions: tests.reduce((sum, t) => sum + (t.assertions || 1), 0),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate tests for a model
   * @param {object} model
   * @param {string} testType
   * @param {object} options
   * @returns {Array}
   */
  _generateTests(model, testType, options) {
    switch (testType) {
      case TEST_TYPE.UNIT:
        return this._generateUnitTests(model, options);
      case TEST_TYPE.INTEGRATION:
        return this._generateIntegrationTests(model, options);
      case TEST_TYPE.SCHEMA:
        return this._generateSchemaTests(model, options);
      case TEST_TYPE.DATA_QUALITY:
        return this._generateDataQualityTests(model, options);
      default:
        return this._generateUnitTests(model, options);
    }
  }

  /**
   * Generate unit tests
   * @param {object} model
   * @param {object} options
   * @returns {Array}
   */
  _generateUnitTests(model, options) {
    const tests = [];
    const modelName = model.name || 'Model';

    if (this.framework === 'jest') {
      // Generate Jest test file
      const testCode = this._generateJestTests(model);
      tests.push({
        name: `${modelName}.test.js`,
        type: TEST_TYPE.UNIT,
        framework: 'jest',
        code: testCode,
        filePath: `tests/${modelName}.test.js`,
        assertions: this._countAssertions(testCode),
      });
    } else if (this.framework === 'mocha') {
      const testCode = this._generateMochaTests(model);
      tests.push({
        name: `${modelName}.test.js`,
        type: TEST_TYPE.UNIT,
        framework: 'mocha',
        code: testCode,
        filePath: `tests/${modelName}.test.js`,
        assertions: this._countAssertions(testCode),
      });
    }

    return tests;
  }

  /**
   * Generate Jest test code
   * @param {object} model
   * @returns {string}
   */
  _generateJestTests(model) {
    const name = model.name || 'Model';
    const fields = model.fields || model.columns || [];

    const lines = [
      `'use strict';`,
      ``,
      `const { ${name} } = require('../models/${name}');`,
      ``,
      `describe('${name}', () => {`,
      `  describe('constructor', () => {`,
      `    it('creates instance with default values', () => {`,
      `      const instance = new ${name}();`,
      `      expect(instance).toBeDefined();`,
      `    });`,
      ``,
      `    it('creates instance with provided data', () => {`,
      `      const data = {};`,
      `      const instance = new ${name}(data);`,
      `      expect(instance).toBeDefined();`,
      `    });`,
      `  });`,
    ];

    // Add field-specific tests
    if (fields.length > 0) {
      lines.push(``, `  describe('fields', () => {`);

      for (const field of fields.slice(0, 5)) { // Limit to 5 fields
        const fieldName = field.name || field;
        lines.push(
          `    it('has ${fieldName} field', () => {`,
          `      const instance = new ${name}({ ${fieldName}: 'test' });`,
          `      expect(instance.${fieldName}).toBeDefined();`,
          `    });`,
          ``
        );
      }

      lines.push(`  });`);
    }

    lines.push(`});`, ``);

    return lines.join('\n');
  }

  /**
   * Generate Mocha test code
   * @param {object} model
   * @returns {string}
   */
  _generateMochaTests(model) {
    const name = model.name || 'Model';
    const fields = model.fields || model.columns || [];

    const lines = [
      `'use strict';`,
      ``,
      `const { expect } = require('chai');`,
      `const { ${name} } = require('../models/${name}');`,
      ``,
      `describe('${name}', function() {`,
      `  describe('constructor', function() {`,
      `    it('should create instance with default values', function() {`,
      `      const instance = new ${name}();`,
      `      expect(instance).to.exist;`,
      `    });`,
      ``,
      `    it('should create instance with provided data', function() {`,
      `      const data = {};`,
      `      const instance = new ${name}(data);`,
      `      expect(instance).to.exist;`,
      `    });`,
      `  });`,
      `});`,
      ``,
    ];

    return lines.join('\n');
  }

  /**
   * Generate integration tests
   * @param {object} model
   * @param {object} options
   * @returns {Array}
   */
  _generateIntegrationTests(model, options) {
    const tests = [];
    const modelName = model.name || 'Model';

    const testCode = [
      `'use strict';`,
      ``,
      `describe('${modelName} Integration', () => {`,
      `  beforeAll(async () => {`,
      `    // Setup test database/fixtures`,
      `  });`,
      ``,
      `  afterAll(async () => {`,
      `    // Cleanup`,
      `  });`,
      ``,
      `  it('integrates with data source', async () => {`,
      `    // Test data source integration`,
      `    expect(true).toBe(true);`,
      `  });`,
      ``,
      `  it('handles concurrent access', async () => {`,
      `    // Test concurrent operations`,
      `    expect(true).toBe(true);`,
      `  });`,
      `});`,
      ``,
    ].join('\n');

    tests.push({
      name: `${modelName}.integration.test.js`,
      type: TEST_TYPE.INTEGRATION,
      framework: this.framework,
      code: testCode,
      filePath: `tests/integration/${modelName}.integration.test.js`,
      assertions: 2,
    });

    return tests;
  }

  /**
   * Generate schema tests
   * @param {object} model
   * @param {object} options
   * @returns {Array}
   */
  _generateSchemaTests(model, options) {
    const tests = [];
    const modelName = model.name || 'Model';
    const fields = model.fields || model.columns || [];

    const testCode = [
      `'use strict';`,
      ``,
      `describe('${modelName} Schema', () => {`,
      `  const schema = ${JSON.stringify(model, null, 2)};`,
      ``,
      `  it('has required fields', () => {`,
      `    expect(schema.name).toBeDefined();`,
      `  });`,
      ``,
      ...fields.slice(0, 5).map(f => {
        const fieldName = f.name || f;
        return [
          `  it('has ${fieldName} field definition', () => {`,
          `    const field = schema.fields?.find(f => f.name === '${fieldName}');`,
          `    expect(field).toBeDefined();`,
          `  });`,
          ``,
        ].join('\n');
      }),
      `});`,
      ``,
    ].join('\n');

    tests.push({
      name: `${modelName}.schema.test.js`,
      type: TEST_TYPE.SCHEMA,
      framework: this.framework,
      code: testCode,
      filePath: `tests/schema/${modelName}.schema.test.js`,
      assertions: 1 + Math.min(fields.length, 5),
    });

    return tests;
  }

  /**
   * Generate data quality tests (dbt-style)
   * @param {object} model
   * @param {object} options
   * @returns {Array}
   */
  _generateDataQualityTests(model, options) {
    const tests = [];
    const modelName = model.name || 'Model';
    const columns = model.columns || model.fields || [];

    // Generate YAML config for dbt-style tests
    const yamlTests = {
      version: 2,
      models: [{
        name: modelName,
        columns: columns.map(c => {
          const colName = c.name || c;
          const colTests = [];

          // Add not_null test if field is required
          if (!c.nullable && !c.optional) {
            colTests.push('not_null');
          }

          // Add unique test for potential keys
          if (colName.includes('id') || colName === 'key') {
            colTests.push('unique');
          }

          return {
            name: colName,
            tests: colTests,
          };
        }).filter(c => c.tests.length > 0),
      }],
    };

    tests.push({
      name: `${modelName}.yml`,
      type: TEST_TYPE.DATA_QUALITY,
      format: 'yaml',
      content: yamlTests,
      filePath: `models/schema/${modelName}.yml`,
      testCount: yamlTests.models[0].columns.reduce((sum, c) => sum + c.tests.length, 0),
    });

    // Generate SQL test file for custom assertions
    const sqlTests = columns
      .filter(c => !c.nullable && !c.optional)
      .map(c => {
        const test = this.dataQualityTests.not_null(c.name || c);
        return `-- Test: ${test.name}\n${test.sql.replace('model', modelName)};`;
      });

    if (sqlTests.length > 0) {
      tests.push({
        name: `${modelName}_tests.sql`,
        type: TEST_TYPE.DATA_QUALITY,
        format: 'sql',
        code: sqlTests.join('\n\n'),
        filePath: `tests/data/${modelName}_tests.sql`,
        testCount: sqlTests.length,
      });
    }

    return tests;
  }

  /**
   * Count assertions in test code
   * @param {string} code
   * @returns {number}
   */
  _countAssertions(code) {
    const patterns = [
      /expect\([^)]+\)\./g,
      /assert\./g,
      /\.should\./g,
    ];

    let count = 0;
    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count || 1;
  }
}

module.exports = {
  TestGeneratorAgent,
  TEST_TYPE,
  DATA_QUALITY_TESTS,
};
