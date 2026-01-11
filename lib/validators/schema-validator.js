/**
 * Schema Validator
 *
 * Validates JSON schemas and data files against schemas.
 * Zero external dependencies - uses native JSON parsing.
 */

const fs = require('fs');

/**
 * Validate JSON syntax
 * @param {string} content - JSON string to validate
 * @returns {{valid: boolean, error?: string, data?: object}}
 */
function validateJsonSyntax(content) {
  try {
    const data = JSON.parse(content);
    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate schema structure (basic validation without external deps)
 * @param {object} schema - The schema object to validate
 * @returns {string[]} Array of issues found
 */
function validateSchemaStructure(schema) {
  const issues = [];

  if (!schema.$schema) {
    issues.push('Missing $schema declaration');
  }

  if (!schema.title) {
    issues.push('Missing title');
  }

  if (!schema.type && !schema.properties && !schema.definitions) {
    issues.push('Schema has no type, properties, or definitions');
  }

  // Check for valid type if present
  const validTypes = ['object', 'array', 'string', 'number', 'boolean', 'null', 'integer'];
  if (schema.type && !validTypes.includes(schema.type)) {
    issues.push(`Invalid type: ${schema.type}`);
  }

  // Check required is an array if present
  if (schema.required && !Array.isArray(schema.required)) {
    issues.push('Required must be an array');
  }

  // Check properties is an object if present
  if (schema.properties && typeof schema.properties !== 'object') {
    issues.push('Properties must be an object');
  }

  return issues;
}

/**
 * Validate data against a schema (basic validation)
 * @param {object} data - The data to validate
 * @param {object} schema - The schema to validate against
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateDataAgainstSchema(data, schema) {
  const errors = [];

  // Type validation
  if (schema.type) {
    const actualType = Array.isArray(data) ? 'array' : typeof data;
    if (schema.type === 'integer') {
      if (typeof data !== 'number' || !Number.isInteger(data)) {
        errors.push(`Expected integer, got ${typeof data}`);
      }
    } else if (actualType !== schema.type) {
      errors.push(`Expected ${schema.type}, got ${actualType}`);
    }
  }

  // Required properties validation
  if (schema.required && schema.type === 'object') {
    for (const prop of schema.required) {
      if (!(prop in data)) {
        errors.push(`Missing required property: ${prop}`);
      }
    }
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`Value must be one of: ${schema.enum.join(', ')}`);
  }

  // Nested properties validation
  if (schema.properties && typeof data === 'object' && data !== null) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in data) {
        const result = validateDataAgainstSchema(data[key], propSchema);
        for (const err of result.errors) {
          errors.push(`${key}: ${err}`);
        }
      }
    }
  }

  // Array items validation
  if (schema.items && Array.isArray(data)) {
    data.forEach((item, index) => {
      const result = validateDataAgainstSchema(item, schema.items);
      for (const err of result.errors) {
        errors.push(`[${index}]: ${err}`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Load and validate a schema file
 * @param {string} schemaPath - Path to the schema file
 * @returns {{valid: boolean, schema?: object, errors: string[]}}
 */
function loadSchema(schemaPath) {
  if (!fs.existsSync(schemaPath)) {
    return { valid: false, errors: [`Schema file not found: ${schemaPath}`] };
  }

  const content = fs.readFileSync(schemaPath, 'utf8');
  const parseResult = validateJsonSyntax(content);

  if (!parseResult.valid) {
    return { valid: false, errors: [`Invalid JSON: ${parseResult.error}`] };
  }

  const structureIssues = validateSchemaStructure(parseResult.data);
  if (structureIssues.length > 0) {
    return { valid: false, schema: parseResult.data, errors: structureIssues };
  }

  return { valid: true, schema: parseResult.data, errors: [] };
}

/**
 * Validate a data file against a schema file
 * @param {string} dataPath - Path to the data file
 * @param {string} schemaPath - Path to the schema file
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateFile(dataPath, schemaPath) {
  // Load schema
  const schemaResult = loadSchema(schemaPath);
  if (!schemaResult.valid) {
    return { valid: false, errors: schemaResult.errors.map(e => `Schema: ${e}`) };
  }

  // Load data
  if (!fs.existsSync(dataPath)) {
    return { valid: false, errors: [`Data file not found: ${dataPath}`] };
  }

  const content = fs.readFileSync(dataPath, 'utf8');
  const parseResult = validateJsonSyntax(content);

  if (!parseResult.valid) {
    return { valid: false, errors: [`Invalid JSON: ${parseResult.error}`] };
  }

  // Validate data against schema
  return validateDataAgainstSchema(parseResult.data, schemaResult.schema);
}

module.exports = {
  validateJsonSyntax,
  validateSchemaStructure,
  validateDataAgainstSchema,
  loadSchema,
  validateFile,
};
