/**
 * Schema Validator Tests
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  validateJsonSyntax,
  validateSchemaStructure,
  validateDataAgainstSchema,
  loadSchema,
  validateFile,
} = require('../../lib/validators/schema-validator');

describe('validateJsonSyntax', () => {
  test('parses valid JSON', () => {
    const result = validateJsonSyntax('{"name": "test"}');
    expect(result.valid).toBe(true);
    expect(result.data).toEqual({ name: 'test' });
  });

  test('rejects invalid JSON', () => {
    const result = validateJsonSyntax('{invalid}');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('handles empty object', () => {
    const result = validateJsonSyntax('{}');
    expect(result.valid).toBe(true);
    expect(result.data).toEqual({});
  });

  test('handles arrays', () => {
    const result = validateJsonSyntax('[1, 2, 3]');
    expect(result.valid).toBe(true);
    expect(result.data).toEqual([1, 2, 3]);
  });
});

describe('validateSchemaStructure', () => {
  test('valid schema passes', () => {
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Test Schema',
      type: 'object',
    };
    const issues = validateSchemaStructure(schema);
    expect(issues).toHaveLength(0);
  });

  test('detects missing $schema', () => {
    const schema = { title: 'Test', type: 'object' };
    const issues = validateSchemaStructure(schema);
    expect(issues).toContain('Missing $schema declaration');
  });

  test('detects missing title', () => {
    const schema = { $schema: 'http://json-schema.org/draft-07/schema#', type: 'object' };
    const issues = validateSchemaStructure(schema);
    expect(issues).toContain('Missing title');
  });

  test('detects invalid type', () => {
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Test',
      type: 'invalid',
    };
    const issues = validateSchemaStructure(schema);
    expect(issues).toContain('Invalid type: invalid');
  });

  test('detects invalid required format', () => {
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Test',
      type: 'object',
      required: 'not-an-array',
    };
    const issues = validateSchemaStructure(schema);
    expect(issues).toContain('Required must be an array');
  });
});

describe('validateDataAgainstSchema', () => {
  test('validates correct object type', () => {
    const schema = { type: 'object' };
    const data = { name: 'test' };
    const result = validateDataAgainstSchema(data, schema);
    expect(result.valid).toBe(true);
  });

  test('detects type mismatch', () => {
    const schema = { type: 'object' };
    const data = 'string';
    const result = validateDataAgainstSchema(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Expected object, got string');
  });

  test('validates required properties', () => {
    const schema = {
      type: 'object',
      required: ['name', 'id'],
    };
    const data = { name: 'test' };
    const result = validateDataAgainstSchema(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required property: id');
  });

  test('validates enum values', () => {
    const schema = { enum: ['a', 'b', 'c'] };
    const result = validateDataAgainstSchema('d', schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('must be one of');
  });

  test('validates nested properties', () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          required: ['name'],
        },
      },
    };
    const data = { user: {} };
    const result = validateDataAgainstSchema(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('user:');
  });

  test('validates array items', () => {
    const schema = {
      type: 'array',
      items: { type: 'number' },
    };
    const data = [1, 'two', 3];
    const result = validateDataAgainstSchema(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('[1]:');
  });

  test('validates integers', () => {
    const schema = { type: 'integer' };
    expect(validateDataAgainstSchema(5, schema).valid).toBe(true);
    expect(validateDataAgainstSchema(5.5, schema).valid).toBe(false);
  });
});

describe('loadSchema', () => {
  const tempDir = path.join(os.tmpdir(), `gywd-test-${ Date.now()}`);

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('loads valid schema file', () => {
    const schemaPath = path.join(tempDir, 'valid.json');
    fs.writeFileSync(schemaPath, JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Test',
      type: 'object',
    }));

    const result = loadSchema(schemaPath);
    expect(result.valid).toBe(true);
    expect(result.schema).toBeDefined();
  });

  test('returns error for missing file', () => {
    const result = loadSchema('/nonexistent/schema.json');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not found');
  });

  test('returns error for invalid JSON', () => {
    const schemaPath = path.join(tempDir, 'invalid.json');
    fs.writeFileSync(schemaPath, '{invalid}');

    const result = loadSchema(schemaPath);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid JSON');
  });
});

describe('validateFile', () => {
  const tempDir = path.join(os.tmpdir(), `gywd-test-validate-${ Date.now()}`);

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });

    // Create schema
    fs.writeFileSync(path.join(tempDir, 'schema.json'), JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Test',
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
      },
    }));

    // Create valid data
    fs.writeFileSync(path.join(tempDir, 'valid.json'), JSON.stringify({
      name: 'test',
    }));

    // Create invalid data
    fs.writeFileSync(path.join(tempDir, 'invalid.json'), JSON.stringify({
      other: 'field',
    }));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('validates matching data', () => {
    const result = validateFile(
      path.join(tempDir, 'valid.json'),
      path.join(tempDir, 'schema.json'),
    );
    expect(result.valid).toBe(true);
  });

  test('detects missing required property', () => {
    const result = validateFile(
      path.join(tempDir, 'invalid.json'),
      path.join(tempDir, 'schema.json'),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required property: name');
  });

  test('returns error for missing data file', () => {
    const result = validateFile(
      '/nonexistent/data.json',
      path.join(tempDir, 'schema.json'),
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not found');
  });
});
